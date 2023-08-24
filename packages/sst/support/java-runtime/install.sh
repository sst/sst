rm -rf release
mkdir release

# Download 2 JARs
# - aws-lambda-java-core-1.2.0.jar
# - aws-lambda-java-serialization-1.0.0.jar
rm -rf build
mkdir build
cp pom.xml build
cd build
mvn dependency:go-offline dependency:copy-dependencies
cd ..
mv build/target/dependency/aws-lambda-java-core-1.2.0.jar release/
mv build/target/dependency/aws-lambda-java-serialization-1.0.0.jar release/

# Build aws-lambda-java-runtime-interface-client-1.1.0.jar
# Note that we cannot use the official JAR due to 2 issues:
# - AWS_LAMBDA_RUNTIME_API has to be of the format "host:port", subpath is not support (ie. "host:port/path")
# - official JAR uses NativeClient that cannot be run on user's machine
rm -rf aws-lambda-java-libs
git clone https://github.com/sst/aws-lambda-java-libs.git
cd aws-lambda-java-libs/aws-lambda-java-runtime-interface-client
mvn -Dmaven.test.skip=true install
cd ../..
mv aws-lambda-java-libs/aws-lambda-java-runtime-interface-client/target/aws-lambda-java-runtime-interface-client-1.1.0.jar release/
