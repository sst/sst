const envPlugin = {
  name: "env",
  setup(build) {
    build.onResolve();
  },
};

module.exports = [envPlugin];
