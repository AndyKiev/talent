def camel_case_to_snake_case(input_str: str) -> str:
    """
    >>> camel_case_to_snake_case("SomeSDK")
    'some_sdk'
    >>> camel_case_to_snake_case("RServoDrive")
    'r_servo_drive'
    >>> camel_case_to_snake_case("SDKDemo")
    'sdk_demo'
    """
    chars = []
    for c_idx, char in enumerate(input_str):
        if c_idx and char.isupper():
            nxt_idx = c_idx + 1
            # idea of the flag is to separate abbreviations
            # as new words, show them in lower case
            flag = nxt_idx >= len(input_str) or input_str[nxt_idx].isupper()
            prev_char = input_str[c_idx - 1]
            if prev_char.isupper() and flag:
                pass
            else:
                chars.append("_")
        chars.append(char.lower())
    return "".join(chars)

def to_camel_case(text: str) -> str:
    """
    Convert snake_case or space-separated text to camelCase.
    Already-camelCase strings (no separators, has internal uppercase) pass through unchanged.

    >>> to_camel_case("some_message_key")
    'someMessageKey'
    >>> to_camel_case("someMessageKey")
    'someMessageKey'
    >>> to_camel_case("hello world")
    'helloWorld'
    """
    if not text:
        return text
    if not any(c in text for c in (" ", "_", "-")) and any(c.isupper() for c in text[1:]):
        return text
    words = text.replace("_", " ").replace("-", " ").split()
    if not words:
        return text
    return words[0].lower() + "".join(w.capitalize() for w in words[1:])