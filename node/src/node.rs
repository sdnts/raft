pub struct RaftNode {
  term: usize,
}

impl RaftNode {
  pub fn new() -> Self {
    Self { term: 0 }
  }
}
