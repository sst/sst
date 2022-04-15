import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

Future main() async {
  await dotenv.load(fileName: ".env");
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  MyApp({Key? key}) : super(key: key);

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  update() async {
    Uri uri = kReleaseMode ? Uri.parse(dotenv.env['PROD_API_URL']!) : Uri.parse(dotenv.env['DEV_API_URL']!);
    var result = await http.post(uri);
    setState(() {
      counter = int.parse(result.body);
    });
  }

  int counter = 0;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Counter App",
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text("Counter App"),
        ),
        body: Container(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text("This button is pressed $counter times"),
                MaterialButton(
                  onPressed: () {
                    setState(() {
                      update();
                    });
                  },
                  child: Text(
                    "Click Me",
                    style: TextStyle(color: Colors.white),
                  ),
                  color: Colors.blue.shade500,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
