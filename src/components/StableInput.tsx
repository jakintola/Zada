import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface StableInputProps extends TextInputProps {
  onChangeText?: (text: string) => void;
}

// Stable input component that maintains focus and syncs with parent state
const StableInput = React.memo(React.forwardRef<TextInput, StableInputProps>(
  ({ onChangeText, value, defaultValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');
    
    // Sync internal value when external value changes
    React.useEffect(() => {
      if (value !== undefined && value !== internalValue) {
        setInternalValue(value);
      }
    }, [value]);
    
    const handleChangeText = React.useCallback((text: string) => {
      setInternalValue(text);
      onChangeText?.(text);
    }, [onChangeText]);

    return (
      <TextInput
        {...props}
        ref={ref}
        value={internalValue}
        onChangeText={handleChangeText}
        blurOnSubmit={false}
        selectTextOnFocus={false}
      />
    );
  }
));

StableInput.displayName = 'StableInput';

export default StableInput;
