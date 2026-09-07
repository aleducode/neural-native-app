import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';

/**
 * Scrolls a focused field out from under the keyboard.
 *
 * iOS keeps the first responder visible by itself. Android does not, and in
 * this app it cannot: the manifest asks for adjustResize, but the app is
 * edge-to-edge, and from Android 15 on those windows are not resized for the
 * keyboard. Nothing moves on its own, so a field low in a long form simply
 * ends up behind it.
 *
 * The field is measured against the window and compared with where the
 * keyboard actually starts, then the list is scrolled by the difference. That
 * assumes nothing about how the form is nested — an earlier version added a
 * field's offset to its container's, which held only while every field sat in
 * one card at one depth, and Editar perfil splits them across two.
 */

/**
 * Breathing room between the field and the keyboard. Generous on purpose: the
 * measurement is taken while the padding for the keyboard is still settling,
 * so a tight value leaves the field sitting exactly on the keyboard's edge.
 * This also keeps the field's label in view, which is what tells the reader
 * which field they are in.
 */
const GAP = 130;

export function useRevealOnFocus() {
  const scrollRef = useRef<ScrollView>(null);
  const offset = useRef(0);

  // Where the keyboard starts, in the coordinates measureInWindow reports.
  // Null means it is down, which is also how a focus knows it has to wait.
  const keyboardTop = useRef<number | null>(null);
  const pending = useRef<TextInput | null>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  const run = useCallback((input: TextInput) => {
    const top = keyboardTop.current;
    if (top == null) return;

    input.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + GAP - top;
      // A field already clear of the keyboard is left alone; scrolling it to
      // some canonical position would move the form for no reason.
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: offset.current + overlap, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      const input = pending.current;
      pending.current = null;
      // The padding that makes room for the keyboard lands after this event,
      // and measuring before it does reads a position that is about to change.
      if (input) setTimeout(() => run(input), 120);
    });

    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      pending.current = null;
    });

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [run]);

  const reveal = useCallback(
    (input: TextInput | null) => {
      if (Platform.OS !== 'android' || !input) return;

      // Moving between fields with the keyboard already up gets no new event,
      // so that case measures straight away.
      if (keyboardTop.current != null) run(input);
      else pending.current = input;
    },
    [run]
  );

  return { scrollRef, onScroll, reveal };
}

export default useRevealOnFocus;
