package helloworld

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import helloworld.App.APIResponse
import org.scalatest.matchers.should._
import org.scalatest.wordspec.AnyWordSpec
import play.api.libs.json.Json

import scala.util.Try

class AppTest extends AnyWordSpec with Matchers{

  "AppTest" should {

    "handleRequest" in {

      val app = new App

      val inputStream=new ByteArrayInputStream(
        """
          | {
          |  "name": "Fred"
          |  }
        """.getBytes)

      val outputStream=new ByteArrayOutputStream(4096)

      app.handleRequest(inputStream, outputStream)

      val apiResponse=Try(Json.parse(outputStream.toString).validate[APIResponse])

      apiResponse.fold(
        parseException => fail(s"ParseException $parseException"),
        _.fold(
          err => fail(s"Body is not a APIResponse. $err"),
          apiResponse => {
            apiResponse.statusCode should be(200)
            apiResponse.headers.get("Content-Type") should contain("application/json")
            apiResponse.body should not be null
            apiResponse.body should include("\"message\"")
            apiResponse.body should include("\"hello world!!x4\"")
            apiResponse.body should include("\"location\"")
          }
        )
      )

    }

  }
}
