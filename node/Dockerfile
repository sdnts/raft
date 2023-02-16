# Stage 1: Install dependencies
FROM rust:bullseye AS builder
WORKDIR /app
COPY Cargo.lock .
COPY Cargo.toml .
RUN mkdir src && echo "fn main(){}" > src/main.rs
RUN mkdir .cargo
RUN cargo vendor > .cargo/config
COPY . .
RUN cargo build --release


# Stage 2: Build runtime image
FROM debian:bullseye-slim AS runner
COPY --from=builder /app/target/release/node /bin
CMD /bin/node