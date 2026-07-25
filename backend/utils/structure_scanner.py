#!/usr/bin/env python3
"""
Project Structure Scanner Utility
Location: talent/backend/utils/structure_scanner.py

Scans project structure and generates visual tree representation.
"""

from pathlib import Path


class ProjectStructureScanner:
    """Scans and visualizes project directory structure."""

    # Common directories/files to exclude
    DEFAULT_EXCLUDES = {
        "__pycache__",
        ".git",
        ".gitignore",
        ".env",
        ".venv",
        "venv",
        "node_modules",
        ".next",
        "dist",
        "build",
        ".DS_Store",
        "*.pyc",
        ".idea",
        ".vscode",
    }

    def __init__(
        self,
        root_path: str,
        exclude: set[str] | None = None,
        include_extensions: set[str] | None = None,
        max_depth: int | None = None,
    ):
        """
        Initialize the scanner.

        Args:
            root_path: Path to the root directory to scan
            exclude: Set of directory/file names to exclude
            include_extensions: Set of file extensions to include (e.g., {'.tsx', '.css'})
            max_depth: Maximum depth to scan (None = no limit)
        """
        self.root_path = Path(root_path).resolve()
        self.exclude = exclude or self.DEFAULT_EXCLUDES
        self.include_extensions = include_extensions or set()
        self.max_depth = max_depth

        if not self.root_path.exists():
            raise ValueError(f"Path does not exist: {self.root_path}")
        if not self.root_path.is_dir():
            raise ValueError(f"Path is not a directory: {self.root_path}")

    def _should_exclude(self, name: str) -> bool:
        """Check if a file/directory should be excluded."""
        if name in self.exclude:
            return True
        if name.startswith("."):
            return True
        return False

    def _should_include_file(self, file_path: Path) -> bool:
        """Check if a file should be included based on extension filter."""
        if not self.include_extensions:
            return True
        return file_path.suffix in self.include_extensions

    def _get_tree_structure(
        self, directory: Path, prefix: str = "", depth: int = 0
    ) -> list[str]:
        """
        Recursively build the tree structure.

        Args:
            directory: Current directory to scan
            prefix: String prefix for the current level
            depth: Current depth in the tree

        Returns:
            List of strings representing the tree structure
        """
        if self.max_depth is not None and depth > self.max_depth:
            return []

        lines = []

        try:
            # Get all entries in the directory, sorted: directories first, then files
            entries = sorted(
                directory.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())
            )
        except PermissionError:
            return [f"{prefix}└── [Permission Denied]"]

        # Filter entries
        filtered_entries = []
        for entry in entries:
            if self._should_exclude(entry.name):
                continue
            if entry.is_file() and not self._should_include_file(entry):
                continue
            filtered_entries.append(entry)

        for i, entry in enumerate(filtered_entries):
            is_last = i == len(filtered_entries) - 1

            # Choose the appropriate connector
            connector = "└── " if is_last else "├── "

            if entry.is_dir():
                # Add directory to tree
                lines.append(f"{prefix}{connector}{entry.name}/")

                # Prepare prefix for children
                extension = "    " if is_last else "│   "

                # Recursively process subdirectory
                lines.extend(
                    self._get_tree_structure(entry, prefix + extension, depth + 1)
                )
            else:
                # Add file to tree
                lines.append(f"{prefix}{connector}{entry.name}")

        return lines

    def scan(self) -> str:
        """
        Scan the directory and return the tree structure as a string.

        Returns:
            String representation of the directory tree
        """
        root_name = self.root_path.name or str(self.root_path)
        lines = [f"{root_name}/"]
        lines.extend(self._get_tree_structure(self.root_path))
        return "\n".join(lines)

    def save_to_file(self, output_path: str) -> str:
        """
        Scan and save the tree structure to a file.

        Args:
            output_path: Path to save the output file

        Returns:
            Path to the saved file
        """
        tree = self.scan()
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(tree + "\n")

        return str(output_file)


def get_project_root() -> Path:
    """
    Get the project root directory (talent/).
    Assumes this file is in talent/backend/utils/
    """
    current_file = Path(__file__).resolve()
    # Go up from utils -> backend -> talent (project root)
    return current_file.parent.parent.parent


def scan_frontend_structure(output_file: str = None) -> str:
    """
    Scan the frontend structure and optionally save to file.

    Args:
        output_file: Optional custom output path. If None, saves to frontend/frontend_structure.txt

    Returns:
        String representation of the directory tree
    """
    project_root = get_project_root()
    frontend_src = project_root / "frontend" / "src"

    if not frontend_src.exists():
        raise ValueError(f"Frontend src directory not found: {frontend_src}")

    # Default output to frontend folder
    if output_file is None:
        output_file = project_root / "frontend" / "src" / "frontend_structure.txt"

    scanner = ProjectStructureScanner(str(frontend_src))
    tree = scanner.scan()

    # Save to file
    scanner.save_to_file(str(output_file))
    print(f"[OK] Frontend structure saved to: {output_file}")

    return tree


def scan_backend_structure(output_file: str = None) -> str:
    """
    Scan the backend structure and optionally save to file.

    Args:
        output_file: Optional custom output path. If None, saves to backend/backend_structure.txt

    Returns:
        String representation of the directory tree
    """
    project_root = get_project_root()
    backend_dir = project_root / "backend"

    if not backend_dir.exists():
        raise ValueError(f"Backend directory not found: {backend_dir}")

    # Default output to backend folder
    if output_file is None:
        output_file = project_root / "backend" / "backend_structure.txt"

    scanner = ProjectStructureScanner(str(backend_dir))
    tree = scanner.scan()

    # Save to file
    scanner.save_to_file(str(output_file))
    print(f"[OK] Backend structure saved to: {output_file}")

    return tree


def scan_all_structures() -> dict:
    """
    Scan both frontend and backend structures.

    Returns:
        Dictionary with both structures
    """
    print("Scanning project structures...\n")

    frontend_tree = scan_frontend_structure()
    print()  # Add spacing
    backend_tree = scan_backend_structure()

    print("\nAll structures generated successfully!")

    return {"frontend": frontend_tree, "backend": backend_tree}


# Command-line interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "frontend":
            # Scan only frontend
            output = sys.argv[2] if len(sys.argv) > 2 else None
            tree = scan_frontend_structure(output)
            print("\n" + tree)

        elif command == "backend":
            # Scan only backend
            output = sys.argv[2] if len(sys.argv) > 2 else None
            tree = scan_backend_structure(output)
            print("\n" + tree)

        elif command == "all":
            # Scan both
            scan_all_structures()

        elif command == "help" or command == "--help" or command == "-h":
            print(
                """
Project Structure Scanner
============================

Usage:
  python backend/utils/structure_scanner.py <command> [output_file]

Commands:
  frontend    Scan frontend structure only
  backend     Scan backend structure only
  all         Scan both frontend and backend structures
  help        Show this help message

Examples:
  # Scan both and save to default locations
  python backend/utils/structure_scanner.py all

  # Scan frontend to custom file
  python backend/utils/structure_scanner.py frontend custom/path/frontend.txt

  # Scan backend to custom file
  python backend/utils/structure_scanner.py backend custom/path/backend.txt

Default output locations:
  - Frontend: talent/frontend/src/frontend_structure.txt
  - Backend:  talent/backend/backend_structure.txt
            """
            )
        else:
            # Assume it's a path argument (backward compatibility)
            path = sys.argv[1]
            output = sys.argv[2] if len(sys.argv) > 2 else None

            scanner = ProjectStructureScanner(path)

            if output:
                scanner.save_to_file(output)
                print(f"Structure saved to: {output}")
            else:
                print(scanner.scan())
    else:
        # No arguments - scan both by default
        scan_all_structures()
