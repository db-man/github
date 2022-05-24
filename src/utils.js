import { constants } from 'db-man';

// // Check something like: "Failed to load resource: the server responded with a status of 409 ()"
// const _checkError = (response) => {
//   if (!response.ok) {
//     console.log("failed response:", response);

//     // http status code is 409
//     // response json = {
//     //   documentation_url: "https://docs.github.com/rest/reference/repos#create-or-update-file-contents"
//     //   message: "{dbs_dir}/{db_name}/{table_name}.json does not match 61c...7ca"
//     // }
//     // response.ok: false
//     // response.status: 409
//     // response.statusText: ""
//     // ? error "Failed to load resource: the server responded with a status of 409 ()"

//     // make the promise be rejected if we didn't get a 2xx response
//     throw new Error("Not 2xx response");
//   }
//   return response;
// };

/**
 *
 * @param {string} path e.g. dbsDir/dbName/tableName.data.json
 * @returns
 */
export const getGitHubFullPath = (path) => `https://github.com/${localStorage.getItem(
  constants.LS_KEY_GITHUB_OWNER,
)}/${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_NAME,
)}/blob/main/${path}`;
export const getGitHubUrl = (path) => `https://github.com/${localStorage.getItem(
  constants.LS_KEY_GITHUB_OWNER,
)}/${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_NAME,
)}/${path}`;

export const getGitHubHistoryPath = (path) => `https://github.com/${localStorage.getItem(
  constants.LS_KEY_GITHUB_OWNER,
)}/${localStorage.getItem(
  constants.LS_KEY_GITHUB_REPO_NAME,
)}/commits/main/${path}`;
