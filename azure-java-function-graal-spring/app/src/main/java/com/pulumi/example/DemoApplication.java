package com.pulumi.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.Collections;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(DemoApplication.class);
        String functionServerPort = System.getenv("FUNCTIONS_HTTPWORKER_PORT");
        if (functionServerPort != null) {
            app.setDefaultProperties(Collections
                    .singletonMap("server.port", functionServerPort));
        }
        app.setWebApplicationType(WebApplicationType.REACTIVE);
        app.run(args);
    }
}