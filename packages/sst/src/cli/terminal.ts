export function clear() {
  // console.clear() removes the content in the viewport in VSCode
  // and on Windows. This is a workaround to preserve the viewport.
  for (let i = 0, l = process.stdout.rows; i < l - 1; i++) {
    console.log("");
  }
  console.clear();
}
