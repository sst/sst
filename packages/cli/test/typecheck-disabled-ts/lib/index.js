"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
import sst from "@serverless-stack/resources";
class MySampleStack extends sst.Stack {
  // set id to take type integer
  constructor(scope, id, props) {
    super(scope, id, props);
    new sst.Function(this, "Lambda", {
      handler: "lambda.handler",
    });
  }
}
function main(app) {
  new MySampleStack(app, "sample");
}
exports.default = main;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1EQUFtRDtBQUVuRCxNQUFNLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNuQyw4QkFBOEI7SUFDOUIsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQy9CLE9BQU8sRUFBRSxnQkFBZ0I7U0FDMUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBRUQsU0FBd0IsSUFBSSxDQUFDLEdBQVk7SUFDdkMsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFGRCx1QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHNzdCBmcm9tIFwiQHNlcnZlcmxlc3Mtc3RhY2svcmVzb3VyY2VzXCI7XG5cbmNsYXNzIE15U2FtcGxlU3RhY2sgZXh0ZW5kcyBzc3QuU3RhY2sge1xuICAvLyBzZXQgaWQgdG8gdGFrZSB0eXBlIGludGVnZXJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IHNzdC5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogc3N0LlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIG5ldyBzc3QuRnVuY3Rpb24odGhpcywgXCJMYW1iZGFcIiwge1xuICAgICAgaGFuZGxlcjogXCJsYW1iZGEuaGFuZGxlclwiLFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG1haW4oYXBwOiBzc3QuQXBwKTogdm9pZCB7XG4gIG5ldyBNeVNhbXBsZVN0YWNrKGFwcCwgXCJzYW1wbGVcIik7XG59XG4iXX0=
