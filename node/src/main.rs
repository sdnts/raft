// mod node;
// mod rpc;

use anyhow::Result;
use std::{thread::sleep, time::Duration};

fn main() -> Result<()> {
    println!("Start Node");
    sleep(Duration::from_secs(10));
    println!("Shutdown Node");

    Ok(())
}
