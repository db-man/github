import { Base64 } from 'js-base64';
import { constants } from 'db-man';

import octokit from './octokit';
import { getGitHubUrl } from './utils';

/**
 * What is diff between (https://octokit.github.io/rest.js/v18#git-get-blob)
 * ```js
 * octokit.rest.git.getBlob({ owner, repo, file_sha });
 * ```
 * @param {string} sha
 * @param {(new AbortController()).signal} signal
 * @returns {Promise}
 */
const getBlob = (sha, signal) => octokit.request('GET /repos/{owner}/{repo}/git/blobs/{sha}', {
  owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
  repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
  sha,
  request: { signal },
});

export const getBlobContentAndSha = (sha, signal) => getBlob(sha, signal).then((response) => ({
  content: JSON.parse(Base64.decode(response.data.content)),
  sha: response.data.sha,
}));

/**
 * @param {string} path can be a file or a dir
 * @param {*} signal
 * @returns {Promise<File|Files>}
 */
export const getFile = (path, signal) => octokit
  .request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
    repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
    path,
    request: { signal },
  })
  .then(({ data }) => data)
  .catch((err) => {
    console.error('getFile failed, err:', err); // eslint-disable-line no-console
    switch (err.status) {
      case 404:
        throw new Error(`Failed to get file: file not found, file path: ${path}`, { cause: err });
      case 403:
        throw new Error(`Failed to get file: file too large, file path: ${path}`, { cause: err });
      default:
        throw new Error('Unknow error when getting file.', { cause: err });
    }
  });

/**
 * @param {string} path can be a file or a dir
 * @param {*} signal
 * @returns {Promise<[err, File|Files]>}
 */
export const getFileV2 = (path, signal) => octokit
  .request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
    repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
    path,
    request: { signal },
  })
  .then(({ data }) => [null, data])
  .catch((err) => {
    const url = getGitHubUrl(path);
    switch (err.status) {
      case 404:
        return [{
          type: 'FileNotFound',
          message: 'Failed to get file: file not found',
          cause: err,
          url,
        }, null];
      case 403:
        return [{
          type: 'FileNoPermission',
          message: 'Failed to get file: file too large',
          cause: err,
          url,
        }, null];
      default:
        return [{
          type: 'FileNoPermission',
          message: 'Unknow error when getting file.',
          cause: err,
          url,
        }, null];
    }
  });

/**
 * Get file less than 1MB
 * @param {string} path
 * @returns {Promise}
 */
export const getFileContentAndSha = (path, signal) => getFile(path, signal)
  .then(({ content, sha }) => {
    let rows = [];
    if (content === '') {
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
 * @param {Object} content File content in JSON object
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const updateFile = async (path, content, sha, msg = 'Update file') => {
  const contentEncoded = Base64.encode(content);
  try {
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      // replace the owner and email with your own details
      owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
      repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
      path,
      sha,
      message: `[db-man] ${msg}`,
      content: contentEncoded,
      committer: {
        name: 'Octokit Bot',
        email: 'your-email',
      },
      author: {
        name: 'Octokit Bot',
        email: 'your-email',
      },
    });
    return data;
  } catch (error) {
    console.error('Failed to createOrUpdateFileContents, error:', error); // eslint-disable-line no-console
    switch (error.response.status) {
      case 409:
        // error.response.data={"message": "dbs_dir/db_name/table_name.data.json does not match c61...e3a","documentation_url": "https://docs.github.com/rest/reference/repos#create-or-update-file-contents"}
        // error.response.status=409
        // file.json does not match c61...e3a
        throw new Error('Status: 409 Conflict');
      default:
        throw error;
    }
  }
};

/**
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const deleteFile = async (path, sha) => {
  try {
    // https://octokit.github.io/rest.js/v18#repos-delete-file
    const { data } = await octokit.rest.repos.deleteFile({
      owner: localStorage.getItem(constants.LS_KEY_GITHUB_OWNER),
      repo: localStorage.getItem(constants.LS_KEY_GITHUB_REPO_NAME),
      path,
      message: '[db-man] delete file',
      sha,
      committer: {
        name: 'Octokit Bot',
        email: 'your-email',
      },
      author: {
        name: 'Octokit Bot',
        email: 'your-email',
      },
    });
    return data;
  } catch (error) {
    console.error('Failed to octokit.rest.repos.deleteFile, error:', error); // eslint-disable-line no-console
    switch (error.response.status) {
      case 409:
        // error.response.data={"message": "dbs_dir/db_name/table_name.data.json does not match c61...e3a","documentation_url": "https://docs.github.com/rest/reference/repos#create-or-update-file-contents"}
        // error.response.status=409
        // file.json does not match c61...e3a
        throw new Error('Status: 409 Conflict');
      default:
        throw error;
    }
  }
};
