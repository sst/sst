<template>
  <div className="App">
    <p>You clicked me {{ count }} times.</p>
    <button @click="onClick()">Click Me!</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      count: 0,
    };
  },
  methods: {
    onClick() {
      fetch(process.env.VUE_APP_API_URL, {
        method: "POST",
      })
        .then((response) => response.text())
        .then((data) => {
          this.count = data;
        });
    },
  },
};
</script>

<style>
body,
html {
  height: 100vh;
  display: grid;
  place-items: center;
}
#root {
  margin: auto;
}
.App {
  text-align: center;
}
p {
  margin-top: 0;
  font-size: 20px;
}
button {
  font-size: 48px;
}
</style>
