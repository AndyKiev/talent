# backend/database/driver_finder.py
import os
from typing import Optional


class DriverFinder:
    """Utility class to find JDBC drivers in the project"""

    @staticmethod
    def find_oracle_driver() -> str:
        """Find the Oracle JDBC driver jar file"""
        # Get the project root directory
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

        possible_paths = [
            # Relative to current file (database directory)
            os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "drivers", "ojdbc8.jar"
            ),
            # Project structure_frontend paths
            os.path.join(project_root, "backend", "database", "drivers", "ojdbc8.jar"),
            os.path.join(project_root, "database", "drivers", "ojdbc8.jar"),
            os.path.join(project_root, "drivers", "ojdbc8.jar"),
            # Environment variable path
            os.environ.get("ORACLE_JDBC_DRIVER_PATH", ""),
            # Current working directory
            os.path.join(os.getcwd(), "drivers", "ojdbc8.jar"),
            os.path.join(os.getcwd(), "database", "drivers", "ojdbc8.jar"),
        ]

        # Filter out empty paths and normalize
        possible_paths = [os.path.abspath(p) for p in possible_paths if p and p.strip()]

        print("Searching for Oracle JDBC driver...")
        for path in possible_paths:
            if os.path.exists(path):
                print(f"✓ Found Oracle driver at: {path}")
                return path
            else:
                print(f"✗ Not found: {path}")

        # If driver not found, provide download instructions
        download_url = (
            "https://www.oracle.com/database/technologies/appdev/jdbc-downloads.html"
        )
        raise FileNotFoundError(
            f"Oracle JDBC driver (ojdbc8.jar) not found.\n"
            f"Please download it from: {download_url}\n"
            f"And place it in one of these locations:\n"
            f"- {os.path.join(project_root, 'backend', 'database', 'drivers', 'ojdbc8.jar')}\n"
            f"- {os.path.join(project_root, 'database', 'drivers', 'ojdbc8.jar')}\n"
            f"Or set ORACLE_JDBC_DRIVER_PATH environment variable."
        )

    @staticmethod
    def find_driver_by_name(driver_name: str) -> str:
        """Find any JDBC driver by filename"""
        # Get the project root directory
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

        possible_paths = [
            # Relative to current file (database directory)
            os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "drivers", driver_name
            ),
            # Project structure_frontend paths
            os.path.join(project_root, "backend", "database", "drivers", driver_name),
            os.path.join(project_root, "database", "drivers", driver_name),
            os.path.join(project_root, "drivers", driver_name),
            # Environment variable path
            os.environ.get("JDBC_DRIVER_PATH", ""),
            # Current working directory
            os.path.join(os.getcwd(), "drivers", driver_name),
            os.path.join(os.getcwd(), "database", "drivers", driver_name),
        ]

        # Filter out empty paths and normalize
        possible_paths = [os.path.abspath(p) for p in possible_paths if p and p.strip()]

        print(f"Searching for JDBC driver: {driver_name}")
        for path in possible_paths:
            if os.path.exists(path):
                print(f"✓ Found driver at: {path}")
                return path

        raise FileNotFoundError(
            f"JDBC driver ({driver_name}) not found in any expected location.\n"
            f"Please place it in one of these directories:\n"
            f"- {os.path.join(project_root, 'backend', 'database', 'drivers')}\n"
            f"- {os.path.join(project_root, 'database', 'drivers')}\n"
            f"Or set JDBC_DRIVER_PATH environment variable."
        )


# Global instance for easy access
driver_finder = DriverFinder()
