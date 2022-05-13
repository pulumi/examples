package stackreadme;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import com.pulumi.Pulumi;
import com.pulumi.core.Output;

public class App {
    public static void main(String[] args) {
        Pulumi.run(ctx -> {
            var strVar = "foo";
            var arrVar = new String[] { "fizz", "buzz" };
            try {
                var readme = Files.readString(Paths.get("./Pulumi.README.md"));
                ctx.export("strVar", Output.of(strVar));
                ctx.export("arrVar", Output.of(arrVar));
                ctx.export("readme", Output.of(readme));

            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }
}
