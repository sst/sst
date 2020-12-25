exports.handler = async function (event) {
  console.log(
    `Logging from inside the SNS Lambda with event message: "${event.Records[0].Sns.Message}"`
  );
  return { status: true };
};
