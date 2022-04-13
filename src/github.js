import { Base64 } from "js-base64";
import { message } from "antd";
import { constants } from "db-man";

import octokit from "./octokit";

/**
 * Get valid file name
 * See: https://stackoverflow.com/a/4814088
 * @param oldStr
 * @returns POSIX "Fully portable filenames"
 */
export const validFilename = (oldStr) => {
  return oldStr.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const _getRecordFileName = (primaryKeyVal) =>
  validFilename(primaryKeyVal) + ".json";

/**
 * What is diff between (https://octokit.github.io/rest.js/v18#git-get-blob)
 * ```js
 * octokit.rest.git.getBlob({ owner, repo, file_sha });
 * ```
 * @param {string} sha
 * @param {(new AbortController()).signal} signal
 * @returns {Promise}
 */
const _getBlob = (sha, signal) =>
  octokit.request("GET /repos/{owner}/{repo}/git/blobs/{sha}", {
    owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
    repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
    sha,
    request: { signal },
  });

export const getBlobContentAndSha = (sha, signal) =>
  _getBlob(sha, signal).then((response) => ({
    content: JSON.parse(Base64.decode(response.data.content)),
    sha: response.data.sha,
  }));

/**
 * @param {string} dbName
 * @param {string} tableName
 * @returns Path for GitHub
 */
export const getRecordPath = (dbName, tableName, primaryKeyVal) =>
  `${localStorage.getItem(
    constants.LS_KEY_GITHUB_REPO_PATH
  )}/${dbName}/${tableName}/${_getRecordFileName(primaryKeyVal)}`;

/**
 * @param {string} path can be a file or a dir
 * @param {*} signal
 * @returns {Promise<File|Files>}
 */
export const getFile = (path, signal) =>
  octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
      repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
      path,
      request: { signal },
    })
    .then(({ data }) => data)
    .catch((err) => {
      console.error("getFile failed, err:", err);
      switch (err.status) {
        case 404:
          message.error(
            "Failed to get file: file not found, file path: " + path,
            10
          );
          break;
        case 403:
          message.error(
            "Failed to get file: file too large, file path: " + path,
            10
          );
          break;
        default:
          message.error("Unknow error when getting file.", 10);
      }
    });

/**
 * Get file less than 1MB
 * @param {string} path
 * @returns {Promise}
 */
export const getFileContentAndSha = (path, signal) =>
  getFile(path, signal).then(({ content, sha }) => {
    let rows = [];
    if (content === "") {
      // This is a new empty file, maybe just created
      rows = [];
    } else {
      rows = JSON.parse(Base64.decode(content));
    }
    return {
      content: rows,
      sha,
    };
  });

/**
 * @param {string} path
 * @param {string} dbName
 * @param {string} tableName
 * @param {new AbortController().signal} signal
 * @returns {Promise}
 */
export const getRecordFileContentAndSha = (
  dbName,
  tableName,
  primaryKeyVal,
  signal
) => {
  const path = getRecordPath(dbName, tableName, primaryKeyVal);
  return getFileContentAndSha(path, signal);
};

/**
 * @param {Object} content File content in JSON object
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const updateFile = async (path, content, sha) => {
  const contentEncoded = Base64.encode(content);
  try {
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      // replace the owner and email with your own details
      owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
      repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
      path,
      sha,
      message: "[db-man] update file",
      content: contentEncoded,
      committer: {
        name: `Octokit Bot`,
        email: "your-email",
      },
      author: {
        name: "Octokit Bot",
        email: "your-email",
      },
    });
    return data;
  } catch (error) {
    console.error("Failed to createOrUpdateFileContents, error:", error);
    switch (error.response.status) {
      case 409:
        // error.response.data={"message": "dbs_dir/db_name/table_name.data.json does not match c61...e3a","documentation_url": "https://docs.github.com/rest/reference/repos#create-or-update-file-contents"}
        // error.response.status=409
        // file.json does not match c61...e3a
        throw new Error("Status: 409 Conflict");
      default:
        throw error;
    }
  }
};

/**
 * @param {Object} content File content in JSON object
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const updateRecordFile = async (
  dbName,
  tableName,
  primaryKey,
  content,
  sha
) => {
  const path = getRecordPath(dbName, tableName, content[primaryKey]);
  return updateFile(path, JSON.stringify(content, null, "  "), sha);
};
