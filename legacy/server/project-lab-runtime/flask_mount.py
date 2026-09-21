import importlib
import os
import sys

from werkzeug.middleware.dispatcher import DispatcherMiddleware
from werkzeug.wrappers import Response

project_source = os.environ["PROJECT_SOURCE"]
project_module = os.environ.get("PROJECT_MODULE", "app")
project_app_object = os.environ.get("PROJECT_APP_OBJECT", "app")
project_prefix = os.environ["PROJECT_PREFIX"]

os.chdir(project_source)
sys.path.insert(0, project_source)

module = importlib.import_module(project_module)
project_app = getattr(module, project_app_object)
application = DispatcherMiddleware(
    Response("Not found", status=404),
    {project_prefix: project_app},
)
