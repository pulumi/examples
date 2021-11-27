import { Input, Unwrap, output } from "@pulumi/pulumi";

// Use same overloading trick as pulumi.all, longer tuples can be added if needed.
export async function unwrap<T1, T2>(value: [Input<T1>, Input<T2>]): Promise<[Unwrap<T1>, Unwrap<T2>]>;
export async function unwrap<T>(value: Input<T>): Promise<Unwrap<T>> {
    return new Promise((resolve) => output(value).apply(resolve));
}
