# GithubUtilsWeb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Environment Configuration

This project uses different environments for development and production:

### Development Environment
- **File**: `src/environments/environment.development.ts`
- **API URL**: `http://localhost:8080/api`
- **Production flag**: `false`
- **Usage**: Automatically used when running `ng serve`

### Production Environment  
- **File**: `src/environments/environment.ts`
- **API URL**: `https://verbose-trout-4j7v6rj9g6j6hqgw4-8080.app.github.dev/api`
- **Production flag**: `true`
- **Usage**: Used when running `ng build --configuration=production`

### Switching Environments
```bash
# Development (default)
ng serve

# Force production environment in development
ng serve --configuration=production

# Production build
ng build --configuration=production
```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
