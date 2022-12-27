package com.pulumi.example;

import com.pulumi.example.model.Greeting;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;

public class HelloFunctionTest {

    @Test
    public void test() {
        Mono<Greeting> result = new HelloFunction().apply(Mono.just("foo"));
        assertThat(result.block().getMessage()).isEqualTo("Hello, foo!\n");
    }
}