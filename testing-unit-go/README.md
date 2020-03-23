# Unit Testing Pulumi programs in Go

An example of writing mock-based unit tests with both infrastructure definition and tests written in Go.

## Prerequisites

[Install Go](https://golang.org/doc/install).

## Running the tests

1. Restore your Go dependencies. This example currently uses [Dep](https://github.com/golang/dep) to do so:

    ```bash
    $ dep ensure
    ```

2.  Run the tests:

    ``` 
    $ go test

    PASS
    ok  	testing-unit-go	0.400s
    ```
