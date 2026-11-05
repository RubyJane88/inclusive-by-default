"""Root fixtures: serve app/, pick a variant, short timeouts."""

import functools
import http.server
import threading
from pathlib import Path

import pytest
from playwright.sync_api import expect

APP_DIR = Path(__file__).parent / "app"
KEY_OVERLAY = (
    Path(__file__).parent / "recording" / "key_overlay.js"
)
VARIANTS = ("broken", "fixed", "hollow")
TIMEOUT_MS = 2000


def pytest_addoption(parser):
    parser.addoption(
        "--variant",
        choices=VARIANTS,
        default="fixed",
        help="which app variant to test",
    )
    parser.addoption(
        "--show-keys",
        action="store_true",
        help="show pressed keys on screen, for recording",
    )


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def app_server():
    handler = functools.partial(
        _QuietHandler, directory=str(APP_DIR)
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), handler
    )
    thread = threading.Thread(
        target=server.serve_forever, daemon=True
    )
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


@pytest.fixture(scope="session")
def base_url(app_server, pytestconfig):
    variant = pytestconfig.getoption("--variant")
    return f"{app_server}/{variant}/"


@pytest.fixture(autouse=True)
def _short_timeouts(request):
    # A test must never hang on video.
    expect.set_options(timeout=TIMEOUT_MS)
    if "page" in request.fixturenames:
        page = request.getfixturevalue("page")
        page.set_default_timeout(TIMEOUT_MS)
        if request.config.getoption("--show-keys"):
            page.add_init_script(path=str(KEY_OVERLAY))
