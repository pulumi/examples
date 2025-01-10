// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.

export function toStringSet(ss: string | Iterable<string>): Set<string>;
export function toStringSet(
    ss?: string | Iterable<string>
): Set<string> | undefined;
export function toStringSet(ss: any): Set<string> | undefined {
    return ss === undefined
        ? undefined
        : typeof ss === "string"
        ? new Set([ss])
        : new Set(ss);
}

export function setToString(ss?: Set<string>): string {
    return `{${[...(ss || [])].join(",")}}`;
}
