import { constants } from "db-man";

import { getFileContentAndSha } from "./github";
import { isLargeTable } from "./dbs";
import { getBlobContentAndSha, getFile, updateFile } from "./github";

const _getDataFileName = (tableName) => tableName + ".data.json";

/**
 * @param {string} dbName
 * @param {string} tableName
 * @returns Path for GitHub, e.g. dbs/dbName/tableName.data.json
 */
export const getDataPath = (dbName, tableName) =>
  `${localStorage.getItem(
    constants.LS_KEY_GITHUB_REPO_PATH
  )}/${dbName}/${_getDataFileName(tableName)}`;

/**
 * @return {string} e.g. "dbs/dbName/columns.json"
 */
const _getDbTableColDefPath = (dbName) =>
  `${localStorage.getItem(
    constants.LS_KEY_GITHUB_REPO_PATH
  )}/${dbName}/columns.json`;

export const getDbTablesSchemaAsync = async (dbName) => {
  const { content } = await getFileContentAndSha(_getDbTableColDefPath(dbName));
  return content;
};

/**
 * Get files more than 1MB
 * @param {string} path
 * @param {string} dbName
 * @param {string} tableName
 * @param {new AbortController().signal} signal
 * @returns {Promise}
 */
export const getTableRows = async (dbName, tableName, signal) => {
  if (isLargeTable(dbName, tableName)) {
    const files = await getFile(
      `${localStorage.getItem(constants.LS_KEY_GITHUB_REPO_PATH)}/${dbName}`,
      signal
    );

    let sha;
    files.forEach((file) => {
      if (file.name === _getDataFileName(tableName)) {
        sha = file.sha;
      }
    });
    return getBlobContentAndSha(sha, signal);
  } else {
    return getFileContentAndSha(getDataPath(dbName, tableName), signal);
  }
};

/**
 * @param {Object} content File content in JSON object
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const updateTableFile = async (dbName, tableName, content, sha) => {
  const path = getDataPath(dbName, tableName);
  return updateFile(path, JSON.stringify(content, null, 1), sha);
};
