// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// let config = new pulumi.Config();

// let nginxLabels = { app: "nginx" };
// let nginxDeployment = new k8s.apps.v1.Deployment("nginx-deployment", {
//     spec: {
//         selector: { matchLabels: nginxLabels },
//         replicas: config.getNumber("replicas") || 2,
//         template: {
//             metadata: { labels: nginxLabels },
//             spec: {
//                 containers: [
//                     {
//                         name: "nginx",
//                         image: "skldjdsjkl",
//                         // image: "nginx:1.7.9",
//                         ports: [{ containerPort: 80 }],
//                     },
//                 ],
//             },
//         },
//     },
// });

// export let nginx = nginxDeployment.metadata.apply(md => md.name);

export interface Disposable {
    dispose(): void;
}

export interface Enumerator<T> extends Disposable {
    current(): T;
    moveNext(): boolean;
    reset(): void;
}

export class RangeEnumerator implements Enumerator<number> {
    private curr: number;

    constructor(private readonly start: number, private readonly stop?: number) {
        this.curr = start - 1;
    }

    public dispose(): void {}

    public current(): number {
        return this.curr;
    }

    public moveNext(): boolean {
        if (this.stop === undefined || this.curr < this.stop) {
            this.curr++;
            return true;
        } else {
            return false;
        }
    }

    public reset(): void {
        this.curr = this.start - 1;
    }
}

export class ListEnumerator<T> implements Enumerator<T> {
    public static from<T>(ts: T[]): ListEnumerator<T> {
        return new ListEnumerator<T>(ts);
    }

    private index: number = -1;

    private constructor(private readonly ts: T[]) {}

    public dispose(): void {}

    public current(): T {
        if (this.index < 0) {
            throw Error("`moveNext` must be called before `current`");
        } else if (this.index >= this.ts.length) {
            throw Error("`current` called after the last element in the sequence");
        }

        return this.ts[this.index];
    }

    public moveNext(): boolean {
        this.index++;
        return this.index < this.ts.length;
    }

    public reset(): void {
        this.index = -1;
    }
}

export interface Enumerable<T> {
    map<U>(f: (t: T) => U): EnumerablePromise<U>;
    filter(f: (t: T) => boolean): EnumerablePromise<T>;
    take(n: number): EnumerablePromise<T>;
    flatMap(f: (t: T, index?: number) => T[]): EnumerablePromise<T>;
    forEach(f: (t: T) => void): void;
}

export class Map<T, U> implements Enumerator<U> {
    constructor(private readonly source: Enumerator<T>, private readonly f: (t: T) => U) {}

    public current(): U {
        return this.f(this.source.current());
    }

    public moveNext(): boolean {
        return this.source.moveNext();
    }

    public reset(): void {
        this.source.reset();
    }

    public dispose(): void {
        this.source.dispose();
    }
}

export class Filter<T> implements Enumerator<T> {
    constructor(private readonly source: Enumerator<T>, private readonly f: (t: T) => boolean) {}

    public current(): T {
        return this.source.current();
    }

    public moveNext(): boolean {
        while (this.source.moveNext()) {
            if (this.f(this.source.current())) {
                return true;
            }
        }
        this.dispose();
        return false;
    }

    public reset(): void {
        this.source.reset();
    }

    public dispose(): void {
        this.source.dispose();
    }
}

export class Take<T> implements Enumerator<T> {
    private index: number = 0;

    constructor(private readonly source: Enumerator<T>, private readonly n: number) {}

    public current(): T {
        return this.source.current();
    }

    public moveNext(): boolean {
        this.index++;
        if (this.index <= this.n && this.source.moveNext()) {
            return true;
        } else {
            return false;
        }
    }

    public reset(): void {
        this.source.reset();
    }

    public dispose(): void {
        this.source.dispose();
    }
}

export class FlatMap<T, U> implements Enumerator<U> {
    private inner: Enumerator<U> = ListEnumerator.from([]);

    constructor(private readonly source: Enumerator<T>, private readonly f: (t: T) => U[]) {}

    public current(): U {
        return this.inner.current();
    }

    public moveNext(): boolean {
        while (true) {
            if (this.inner.moveNext()) {
                return true;
            }

            if (!this.source.moveNext()) {
                return false;
            }
            const inner = this.f(this.source.current());
            if (Array.isArray(inner)) {
                this.inner = ListEnumerator.from(inner);
            } else {
                this.inner = inner;
            }
        }
    }

    public reset(): void {
        this.source.reset();
    }

    public dispose(): void {
        this.source.dispose();
    }
}

export class EnumerablePromise<T> implements Enumerable<T> {
    private constructor(private readonly source: PromiseLike<Enumerator<T>>) {}

    static from<T>(source: T[] | PromiseLike<T[]>): EnumerablePromise<T> {
        if (Array.isArray(source)) {
            return new EnumerablePromise(Promise.resolve(ListEnumerator.from(source)));
        } else {
            return new EnumerablePromise(source.then(ListEnumerator.from));
        }
    }

    static range(start: number, stop?: number): EnumerablePromise<number> {
        return new EnumerablePromise(Promise.resolve(new RangeEnumerator(start, stop)));
    }

    public map<U>(f: (t: T) => U): EnumerablePromise<U> {
        return new EnumerablePromise(this.source.then(ts => new Map(ts, f)));
    }

    public filter(f: (t: T) => boolean): EnumerablePromise<T> {
        return new EnumerablePromise(this.source.then(ts => new Filter(ts, f)));
    }

    public take(n: number): EnumerablePromise<T> {
        return new EnumerablePromise(this.source.then(ts => new Take(ts, n)));
    }

    public flatMap<U>(f: (t: T) => U[]): EnumerablePromise<U> {
        return new EnumerablePromise(this.source.then(ts => new FlatMap(ts, f)));
    }

    public forEach(f: (t: T) => void): void {
        this.source.then(ts => {
            while (ts.moveNext()) {
                f(ts.current());
            }
            ts.dispose();
        });
    }
}

// EnumerablePromise.from([1, 2, 3, 4])
EnumerablePromise.range(1)
    .map(x => x + 2)
    .take(10)
    .filter(x => x > 4)
    .flatMap(x => [x + 1])
    .forEach(console.log);

// pulumi.runtime.getResourceOutputs(pulumi.runtime.getStack()).then(ds => {
//     // JSON.stringify(ds, undefined, "  ");
//     console.log(JSON.stringify(ds, undefined, "  "));
// });
