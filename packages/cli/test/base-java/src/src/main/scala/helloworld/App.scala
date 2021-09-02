package helloworld

import java.io._
import java.net.URL
import java.nio.charset.StandardCharsets.UTF_8
import java.util.stream.Collectors

import com.amazonaws.services.lambda.runtime.Context
import play.api.libs.json.{Json, Writes}

import scala.io.Source
import scala.util.Try

private object App {
  case class APIResponse(statusCode: Int, headers: Map[String, String] = Map.empty, body: String)

  implicit val apiResponseFormat = Json.format[APIResponse]

  case class BodyResponse(message: String, location: String)

  implicit val bodyResponseFormat = Json.format[BodyResponse]
}

class App {

  import App._

  def handleRequest(inputStream: InputStream, lambdaOutput: OutputStream): Unit={

    val inputString = Source.fromInputStream(inputStream).mkString

    if (null!=inputString) println(s"input=$inputString")

    val headers=Map("Content-Type"-> "application/json", "X-Custom-Header"-> "application/json")

    val apiResponse=Try{
      val pageContents= getPageContents("https://checkip.amazonaws.com")
      val bodyResponse=stringify(BodyResponse("hello world!!", pageContents))

      APIResponse(200, headers, bodyResponse)
    }.recover {
      case th =>
        APIResponse(500, headers,
          s"""
             |{ "exception": "$th" }
             |""".stripMargin)
    }.get


    lambdaOutput.write(stringify(apiResponse).getBytes(UTF_8))
  }

  private def stringify[T](o: T)(implicit tjs: Writes[T]): String = {
    Json.stringify(Json.toJson(o))
  }

  private def getPageContents(address: String) = {
   Source.fromURL(address).mkString
  }

}
