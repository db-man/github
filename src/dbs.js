import { constants } from "db-man";

/**
 * ```json
 * {
 *   "iam": [
 *     {"name": "users", "large": true},
 *     {"name": "roles"}
 *   ]
 * }
 * ```
 */
export const dbs = JSON.parse(
  localStorage.getItem(constants.LS_KEY_DBS_SCHEMA)
);

export const isLargeTable = (dbName, tableName) => {
  const table = getTable(dbName, tableName);
  if (!table) return false;
  return table.large;
};

/**
 * @param {string} dbName
 * @param {string} tableName
 * @returns {Object|null} Returns null when table not found
 */
export const getTable = (dbName, tableName) => {
  if (!dbs || !dbs[dbName]) return null;
  return dbs[dbName].find(({ name }) => name === tableName);
};
