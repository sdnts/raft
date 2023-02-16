use std::{
  io::Write,
  net::{Shutdown, TcpListener},
  thread,
};

use anyhow::{Context, Result};

fn main() -> Result<()> {
  let server =
    TcpListener::bind("0.0.0.0:8080").context("Could not bind to socket")?;
  println!("Listening on :8080");

  loop {
    let (mut stream, addr) =
      server.accept().context("Could not connect to client")?;

    thread::spawn(move || {
      println!("Incoming connection from {addr}");
      let response = "HTTP/1.1 200 OK
Connection: close
Content-Type: text/plain

Hello world!";
      stream
        .write(response.as_bytes())
        .context("Could not write response")?;

      stream
        .shutdown(Shutdown::Both)
        .context("Could not shut down stream")?;

      Ok::<(), anyhow::Error>(())
    });
  }
}
