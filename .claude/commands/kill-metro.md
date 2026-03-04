Kill the running Metro bundler process.

Run `lsof -ti:8081 | xargs kill -9 2>/dev/null` to kill any process running on port 8081 (Metro's default port). Report whether a process was killed or none was found.
