pub enum NodeMessage {}

pub enum ClientMessage {}

// let server = TcpListener::bind("0.0.0.0:8080")?;

// for socket in server.incoming() {
//   spawn(move || {
//     if socket.is_err() {
//       return Err(anyhow!("Connection failed")).context("Peer disconnect");
//     }

//     let socket = socket.unwrap();
//     let mut websocket = accept(socket)?;

//     println!(
//       "[{:?}] New connection",
//       SystemTime::now()
//         .duration_since(UNIX_EPOCH)
//         .unwrap()
//         .as_millis()
//     );

//     loop {
//       let msg = websocket.read_message().context("read_message failed")?;
//       let msg = msg.into_text().context("Malformed message")?;
//       println!(
//         "[{:?}] Received: {msg}",
//         SystemTime::now()
//           .duration_since(UNIX_EPOCH)
//           .unwrap()
//           .as_millis()
//       );

//       websocket
//         .write_message(tungstenite::Message::Text(String::from("pong")))?;
//     }

//     #[allow(unreachable_code)]
//     Ok(())
//   });
// }
