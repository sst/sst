export default {
  async scheduled(event, env, ctx) {
    console.log(`Running every ${event.cron}`);
  },
};

