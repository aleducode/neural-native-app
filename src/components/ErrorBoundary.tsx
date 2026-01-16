import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors, typography, spacing } from '../theme/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and report them to Sentry
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    Sentry.withScope((scope) => {
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });

    // Log to console for development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>
            Lo sentimos, ocurrió un error inesperado. El error ha sido reportado automáticamente.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorText}>{this.state.error.toString()}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgDark,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error || '#ff4444',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});

export default ErrorBoundary;
