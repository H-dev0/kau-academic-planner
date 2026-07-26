from __future__ import annotations

import os
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]


class AzureIisnodeEntrypointTests(unittest.TestCase):
    def assert_startup_path_serves_homepage(self, command: list[str]) -> None:
        with socket.socket() as reserved:
            reserved.bind(("127.0.0.1", 0))
            port = reserved.getsockname()[1]

        environment = os.environ.copy()
        environment["PORT"] = str(port)
        process = subprocess.Popen(
            command,
            cwd=ROOT,
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    stdout, stderr = process.communicate(timeout=1)
                    self.fail(f"startup exited early: stdout={stdout!r} stderr={stderr!r}")
                try:
                    with urlopen(f"http://127.0.0.1:{port}/", timeout=1) as response:
                        self.assertEqual(response.status, 200)
                        self.assertIn(b"<!doctype html>", response.read().lower())
                        return
                except URLError:
                    time.sleep(0.05)
            self.fail("startup did not serve the homepage within 10 seconds")
        finally:
            if process.poll() is None:
                process.terminate()
            try:
                process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate(timeout=5)

    def test_direct_local_startup_remains_supported(self) -> None:
        self.assert_startup_path_serves_homepage(["node", "server.js"])

    def test_iisnode_style_module_loading_starts_server(self) -> None:
        self.assert_startup_path_serves_homepage(
            ["node", "-e", "require('./azure-iisnode-entrypoint.js')"]
        )

    def test_web_config_routes_only_through_azure_entrypoint(self) -> None:
        web_config = (ROOT / "web.config").read_text(encoding="utf-8")
        self.assertEqual(web_config.count('path="azure-iisnode-entrypoint.js"'), 1)
        self.assertEqual(web_config.count('url="azure-iisnode-entrypoint.js"'), 1)
        self.assertNotIn('path="server.js"', web_config)
        self.assertNotIn('url="server.js"', web_config)


if __name__ == "__main__":
    unittest.main()
