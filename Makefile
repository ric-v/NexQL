.PHONY: all clean install build test package package-nightly publish publish-nightly \
       build-core build-postgres build-mysql build-sqlite build-mssql build-oracle \
       package-core package-postgres package-mysql package-sqlite package-mssql package-oracle \
       package-nightly-core package-nightly-postgres package-nightly-mysql package-nightly-sqlite package-nightly-mssql package-nightly-oracle \
       publish-core publish-postgres publish-mysql publish-sqlite publish-mssql publish-oracle \
       publish-nightly-core publish-nightly-postgres publish-nightly-mysql publish-nightly-sqlite publish-nightly-mssql publish-nightly-oracle \
       test-core test-postgres test-mysql test-sqlite test-mssql test-oracle \
       help

# ──────────────────────────────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────────────────────────────
NODE_BIN  := node
NPM_BIN   := npm
VSCE_CMD  := npx -y @vscode/vsce@2.24.0
OVSX_CMD  := npx -y ovsx

PACKAGES       := core ext-postgres ext-mysql ext-sqlite ext-mssql ext-oracle
DB_EXTENSIONS  := ext-postgres ext-mysql ext-sqlite ext-mssql ext-oracle

# ──────────────────────────────────────────────────────────────────────
# All-package targets
# ──────────────────────────────────────────────────────────────────────

# Default target
all: clean install build package

# Install dependencies for all packages (npm workspaces handles linking)
install:
	$(NPM_BIN) ci

# Build ALL packages — core first, then database extensions
build: build-core
	@for pkg in $(DB_EXTENSIONS); do \
		$(NPM_BIN) run build --workspace=packages/$$pkg; \
	done

# compile: compile-core compile-postgres compile-mysql compile-sqlite compile-oracle

# Test ALL packages
test:
	@for pkg in $(PACKAGES); do \
		$(NPM_BIN) run test --workspace=packages/$$pkg; \
	done

# Package ALL packages into .vsix files
package: build
	@for pkg in $(PACKAGES); do \
		$(NPM_BIN) run package --workspace=packages/$$pkg; \
	done

# Package ALL packages as nightly/pre-release .vsix files
package-nightly: build
	@for pkg in $(PACKAGES); do \
		$(NPM_BIN) run package:nightly --workspace=packages/$$pkg; \
	done

# Publish ALL packages (stable) — core first, then database extensions
publish: package
	@echo "Publishing core first (dependency ordering)..."
	$(NPM_BIN) run publish:vsce --workspace=packages/core
	$(NPM_BIN) run publish:ovsx --workspace=packages/core
	@echo "Publishing database extensions..."
	@for pkg in $(DB_EXTENSIONS); do \
		$(NPM_BIN) run publish:vsce --workspace=packages/$$pkg; \
		$(NPM_BIN) run publish:ovsx --workspace=packages/$$pkg; \
	done

# Publish ALL packages (nightly/pre-release) — core first, then database extensions
publish-nightly: package-nightly
	@echo "Publishing core nightly first (dependency ordering)..."
	$(NPM_BIN) run publish:vsce --workspace=packages/core
	$(NPM_BIN) run publish:ovsx --workspace=packages/core
	@echo "Publishing database extension nightlies..."
	@for pkg in $(DB_EXTENSIONS); do \
		$(NPM_BIN) run publish:vsce --workspace=packages/$$pkg; \
		$(NPM_BIN) run publish:ovsx --workspace=packages/$$pkg; \
	done

# Clean build artifacts in ALL packages
clean:
	@for pkg in $(PACKAGES); do \
		echo "Cleaning packages/$$pkg..."; \
		rm -rf packages/$$pkg/out packages/$$pkg/dist packages/$$pkg/*.vsix; \
	done
	rm -rf *.vsix


# ──────────────────────────────────────────────────────────────────────
# Per-package compile targets
# ──────────────────────────────────────────────────────────────────────

compile-core:
	$(NPM_BIN) run compile --workspace=packages/core

compile-postgres:
	$(NPM_BIN) run compile --workspace=packages/ext-postgres

compile-mysql:
	$(NPM_BIN) run compile --workspace=packages/ext-mysql

compile-sqlite:
	$(NPM_BIN) run compile --workspace=packages/ext-sqlite

compile-mssql:
	$(NPM_BIN) run compile --workspace=packages/ext-mssql

compile-oracle:
	$(NPM_BIN) run compile --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package build targets
# ──────────────────────────────────────────────────────────────────────

build-core:
	$(NPM_BIN) run build --workspace=packages/core

build-postgres:
	$(NPM_BIN) run build --workspace=packages/ext-postgres

build-mysql:
	$(NPM_BIN) run build --workspace=packages/ext-mysql

build-sqlite:
	$(NPM_BIN) run build --workspace=packages/ext-sqlite

build-mssql:
	$(NPM_BIN) run build --workspace=packages/ext-mssql

build-oracle:
	$(NPM_BIN) run build --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package test targets
# ──────────────────────────────────────────────────────────────────────

test-core:
	$(NPM_BIN) run test --workspace=packages/core

test-postgres:
	$(NPM_BIN) run test --workspace=packages/ext-postgres

test-mysql:
	$(NPM_BIN) run test --workspace=packages/ext-mysql

test-sqlite:
	$(NPM_BIN) run test --workspace=packages/ext-sqlite

test-mssql:
	$(NPM_BIN) run test --workspace=packages/ext-mssql

test-oracle:
	$(NPM_BIN) run test --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package package targets
# ──────────────────────────────────────────────────────────────────────

package-core: build-core
	$(NPM_BIN) run package --workspace=packages/core

package-postgres: build-postgres
	$(NPM_BIN) run package --workspace=packages/ext-postgres

package-mysql: build-mysql
	$(NPM_BIN) run package --workspace=packages/ext-mysql

package-sqlite: build-sqlite
	$(NPM_BIN) run package --workspace=packages/ext-sqlite

package-mssql: build-mssql
	$(NPM_BIN) run package --workspace=packages/ext-mssql

package-oracle: build-oracle
	$(NPM_BIN) run package --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package package-nightly targets
# ──────────────────────────────────────────────────────────────────────

package-nightly-core: build-core
	$(NPM_BIN) run package:nightly --workspace=packages/core

package-nightly-postgres: build-postgres
	$(NPM_BIN) run package:nightly --workspace=packages/ext-postgres

package-nightly-mysql: build-mysql
	$(NPM_BIN) run package:nightly --workspace=packages/ext-mysql

package-nightly-sqlite: build-sqlite
	$(NPM_BIN) run package:nightly --workspace=packages/ext-sqlite

package-nightly-mssql: build-mssql
	$(NPM_BIN) run package:nightly --workspace=packages/ext-mssql

package-nightly-oracle: build-oracle
	$(NPM_BIN) run package:nightly --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package publish targets (stable)
# ──────────────────────────────────────────────────────────────────────

publish-core: package-core
	$(NPM_BIN) run publish:vsce --workspace=packages/core
	$(NPM_BIN) run publish:ovsx --workspace=packages/core

publish-postgres: package-postgres
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-postgres
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-postgres

publish-mysql: package-mysql
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-mysql
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-mysql

publish-sqlite: package-sqlite
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-sqlite
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-sqlite

publish-mssql: package-mssql
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-mssql
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-mssql

publish-oracle: package-oracle
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-oracle
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Per-package publish-nightly targets
# ──────────────────────────────────────────────────────────────────────

publish-nightly-core: package-nightly-core
	$(NPM_BIN) run publish:vsce --workspace=packages/core
	$(NPM_BIN) run publish:ovsx --workspace=packages/core

publish-nightly-postgres: package-nightly-postgres
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-postgres
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-postgres

publish-nightly-mysql: package-nightly-mysql
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-mysql
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-mysql

publish-nightly-sqlite: package-nightly-sqlite
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-sqlite
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-sqlite

publish-nightly-mssql: package-nightly-mssql
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-mssql
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-mssql

publish-nightly-oracle: package-nightly-oracle
	$(NPM_BIN) run publish:vsce --workspace=packages/ext-oracle
	$(NPM_BIN) run publish:ovsx --workspace=packages/ext-oracle

# ──────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────

help:
	@echo "NexQL Monorepo — Available targets"
	@echo ""
	@echo "All-package targets:"
	@echo "  all              : Clean, install, build, and package all packages"
	@echo "  install          : Install dependencies for all packages"
	@echo "  build            : Build all packages (core first, then extensions)"
	@echo "  test             : Test all packages"
	@echo "  package          : Package all packages into .vsix files"
	@echo "  package-nightly  : Package all packages as nightly/pre-release .vsix files"
	@echo "  publish          : Publish all packages (core first) to VS Code Marketplace and Open VSX"
	@echo "  publish-nightly  : Publish all packages (core first) as nightly to both marketplaces"
	@echo "  clean            : Remove build artifacts from all packages"
	@echo ""
	@echo "Per-package build targets:"
	@echo "  build-core       build-postgres    build-mysql"
	@echo "  build-sqlite     build-mssql       build-oracle"
	@echo ""
	@echo "Per-package test targets:"
	@echo "  test-core        test-postgres     test-mysql"
	@echo "  test-sqlite      test-mssql        test-oracle"
	@echo ""
	@echo "Per-package package targets:"
	@echo "  package-core     package-postgres   package-mysql"
	@echo "  package-sqlite   package-mssql      package-oracle"
	@echo ""
	@echo "Per-package publish targets (stable):"
	@echo "  publish-core     publish-postgres   publish-mysql"
	@echo "  publish-sqlite   publish-mssql      publish-oracle"
	@echo ""
	@echo "Per-package publish targets (nightly):"
	@echo "  publish-nightly-core     publish-nightly-postgres   publish-nightly-mysql"
	@echo "  publish-nightly-sqlite   publish-nightly-mssql      publish-nightly-oracle"
