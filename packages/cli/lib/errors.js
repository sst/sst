function isSubProcessError(e) {
  return e.message === "Subprocess exited with error 1";
}

module.exports = {
  isSubProcessError,
};
