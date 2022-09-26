package minimal.java.native;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import io.micronaut.function.aws.runtime.AbstractMicronautLambdaRuntime;
import java.net.MalformedURLException;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import io.micronaut.core.annotation.Nullable;
public class FunctionLambdaRuntime extends AbstractMicronautLambdaRuntime<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent, APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>
{
    public static void main(String[] args) {
        try {
            new FunctionLambdaRuntime().run(args);

        } catch (MalformedURLException e) {
            e.printStackTrace();
        }
    }

    @Override
    @Nullable
    protected RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> createRequestHandler(String... args) {
        return new FunctionRequestHandler();
    }
}
