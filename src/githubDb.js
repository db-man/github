import { constants } from 'db-man';

import {
  getFileContentAndSha, getBlobContentAndSha, getFile, updateFile, deleteFile,
} from './github';
import { isLargeTable } from './dbs';
import { getGitHubFullPath } from './utils';

/**
 * Get valid file name
 * See: https://stackoverflow.com/a/4814088
 * @param oldStr
 * @returns POSIX "Fully portable filenames"
 */
export const validFilename = (oldStr) => oldStr.replace(/[^a-zA-Z0-9._-]/g, '_');

const getDataFileName = (tableName) => `${tableName}.data.json`;

const getRecordFileName = (primaryKeyVal) => `${validFilename(primaryKeyVal)}.json`;

/**
 * @param {string} dbName
 * @param {string} tableName
 * @returns Path for GitHub
 */
export const getRecordPath = (dbName, tableName, primaryKeyVal) => `${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_PATH,
)}/${dbName}/${tableName}/${getRecordFileName(primaryKeyVal)}`;

/**
 * @param {string} dbName
 * @param {string} tableName
 * @returns Path for GitHub, e.g. dbs/dbName/tableName.data.json
 */
export const getDataPath = (dbName, tableName) => `${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_PATH,
)}/${dbName}/${getDataFileName(tableName)}`;

/**
* @param {string} dbName
* @param {string} tableName
* @returns GitHub URL of table data file, e.g. https://github.com/ownerName/repoName/blob/main/dbs/dbName/tableName.data.json
*/
export const getDataUrl = (dbName, tableName) => getGitHubFullPath(
  getDataPath(dbName, tableName),
);

/**
 * @return {string} e.g. "dbs/dbName/columns.json"
 */
const getDbTableColDefPath = (dbName) => `${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_PATH,
)}/${dbName}/columns.json`;

export const getDbTablesSchemaAsync = async (dbName) => {
  const { content } = await getFileContentAndSha(getDbTableColDefPath(dbName));
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
      signal,
    );

    let sha;
    files.forEach((file) => {
      if (file.name === getDataFileName(tableName)) {
        sha = file.sha;
      }
    });
    return getBlobContentAndSha(sha, signal);
  }
  return getFileContentAndSha(getDataPath(dbName, tableName), signal);
};

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
  signal,
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
export const updateTableFile = async (dbName, tableName, content, sha) => {
  const path = getDataPath(dbName, tableName);
  return updateFile(path, JSON.stringify(content, null, 1), sha, 'Update table file');
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
  record,
  sha,
) => {
  const path = getRecordPath(dbName, tableName, record[primaryKey]);
  return updateFile(path, JSON.stringify(record, null, '  '), sha, 'Update record file');
};

/**
 * @return {Promise<Response>}
 * response.commit
 * response.commit.html_url https://github.com/username/reponame/commit/a7f...04d
 * response.content
 */
export const deleteRecordFile = async (
  dbName,
  tableName,
  primaryKeyVal,
  sha,
) => {
  const path = getRecordPath(dbName, tableName, primaryKeyVal);
  return deleteFile(path, sha);
};
