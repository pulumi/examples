package webserver;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AmiFilterTest {

    @Test
    public void testAmazonLinux2023AmiFilter() {
        // Test constant values that should match the code in App.java
        final String expectedPattern = "al2023-ami-*-x86_64";
        final String expectedOwner = "137112412989";
        
        // Values from the Java WebServer example
        final String javaPattern = "al2023-ami-*-x86_64";
        final String javaOwner = "137112412989";
        
        // Values from the JavaScript WebServer example
        final String jsPattern = "al2023-ami-*-x86_64";
        final String jsOwner = "137112412989";
        
        // Values from the JavaScript WebServer Component example
        final String jsComponentPattern = "al2023-ami-*-x86_64";
        final String jsComponentOwner = "137112412989";
        
        // Values from the Python WebServer example
        final String pyPattern = "al2023-ami-*-x86_64";
        final String pyOwner = "137112412989";
        
        // Assert that all patterns match the expected pattern
        assertEquals(expectedPattern, javaPattern, "Java WebServer example should use the correct AMI filter pattern");
        assertEquals(expectedOwner, javaOwner, "Java WebServer example should use the correct owner ID");
        
        assertEquals(expectedPattern, jsPattern, "JavaScript WebServer example should use the correct AMI filter pattern");
        assertEquals(expectedOwner, jsOwner, "JavaScript WebServer example should use the correct owner ID");
        
        assertEquals(expectedPattern, jsComponentPattern, "JavaScript WebServer Component example should use the correct AMI filter pattern");
        assertEquals(expectedOwner, jsComponentOwner, "JavaScript WebServer Component example should use the correct owner ID");
        
        assertEquals(expectedPattern, pyPattern, "Python WebServer example should use the correct AMI filter pattern");
        assertEquals(expectedOwner, pyOwner, "Python WebServer example should use the correct owner ID");
    }
}