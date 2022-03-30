/* eslint-disable @typescript-eslint/no-var-requires */
const { writeFile } = require('fs');

const targetPath = `./src/environments/environment.ts`;

const environmentFileContent = `
export const environment = {
  production: ${false},
  API_URL:  "${process.env['DEV_API_URL']}",
};
`;
// write the content to the respective file
writeFile(targetPath, environmentFileContent, function (err: unknown) {
  if (err) {
    console.log(err);
  }
  console.log(`Wrote variables to ${targetPath}`);
});
