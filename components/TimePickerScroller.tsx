import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { height } = Dimensions.get('window');

interface TimePickerScrollerProps {
  value: string;
  onChange: (time: string) => void;
  style?: any;
}

export default function TimePickerScroller({ value, onChange, style }: TimePickerScrollerProps) {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const periodScrollRef = useRef<ScrollView>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const itemHeight = 50;
  const visibleItems = 3;
  const scrollViewHeight = itemHeight * visibleItems;

  useEffect(() => {
    if (value) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':').map(Number);
      
      setSelectedHour(hour === 0 ? 12 : hour > 12 ? hour - 12 : hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period || (hour >= 12 ? 'PM' : 'AM'));
    }
  }, [value]);

  const updateTime = (hour: number, minute: number, period: string) => {
    const hour24 = period === 'AM' 
      ? (hour === 12 ? 0 : hour)
      : (hour === 12 ? 12 : hour + 12);
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleScroll = (
    event: any,
    items: any[],
    setter: (value: any) => void,
    getValue: (item: any) => any = (item) => item
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    const newValue = getValue(items[clampedIndex]);
    setter(newValue);
    
    // Update time when any value changes
    if (setter === setSelectedHour) {
      updateTime(newValue, selectedMinute, selectedPeriod);
    } else if (setter === setSelectedMinute) {
      updateTime(selectedHour, newValue, selectedPeriod);
    } else if (setter === setSelectedPeriod) {
      updateTime(selectedHour, selectedMinute, newValue);
    }
  };

  const scrollToValue = (scrollRef: React.RefObject<ScrollView>, value: number, items: any[]) => {
    const index = items.findIndex(item => item === value);
    if (index !== -1) {
      scrollRef.current?.scrollTo({
        y: index * itemHeight,
        animated: false,
      });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToValue(hourScrollRef, selectedHour, hours);
      scrollToValue(minuteScrollRef, selectedMinute, minutes);
      scrollToValue(periodScrollRef, selectedPeriod, periods);
    }, 100);
  }, []);

  const renderPickerItem = (item: any, isSelected: boolean, displayValue?: string) => (
    <View key={item} style={[styles.pickerItem, isSelected && styles.selectedPickerItem]}>
      <Text style={[styles.pickerText, isSelected && styles.selectedPickerText]}>
        {displayValue || item}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.pickerContainer}>
        {/* Hours */}
        <View style={styles.pickerColumn}>
          <ScrollView
            ref={hourScrollRef}
            style={styles.picker}
            contentContainerStyle={styles.pickerContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={itemHeight}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => handleScroll(event, hours, setSelectedHour)}
          >
            {hours.map((hour) => renderPickerItem(hour, hour === selectedHour, hour.toString()))}
          </ScrollView>
        </View>

        <Text style={styles.separator}>:</Text>

        {/* Minutes */}
        <View style={styles.pickerColumn}>
          <ScrollView
            ref={minuteScrollRef}
            style={styles.picker}
            contentContainerStyle={styles.pickerContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={itemHeight}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => handleScroll(event, minutes, setSelectedMinute)}
          >
            {minutes.map((minute) => renderPickerItem(minute, minute === selectedMinute, minute.toString().padStart(2, '0')))}
          </ScrollView>
        </View>

        {/* AM/PM */}
        <View style={styles.pickerColumn}>
          <ScrollView
            ref={periodScrollRef}
            style={styles.picker}
            contentContainerStyle={styles.pickerContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={itemHeight}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => handleScroll(event, periods, setSelectedPeriod)}
          >
            {periods.map((period) => renderPickerItem(period, period === selectedPeriod))}
          </ScrollView>
        </View>
      </View>

      {/* Selection Indicator */}
      <View style={styles.selectionIndicator} />
      
      {/* Selection Bubble - cut off at bottom */}
      <View style={styles.selectionBubble} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  picker: {
    height: 150,
    width: '100%',
  },
  pickerContent: {
    paddingVertical: 50,
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPickerItem: {
    // Selected item styling handled by overlay
  },
  pickerText: {
    fontSize: 18,
    color: 'white',
    fontFamily: 'Inter-Medium',
  },
  selectedPickerText: {
    color: '#647696',
    fontWeight: 'bold',
    fontSize: 20,
  },
  separator: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontFamily: 'Inter-Bold',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  selectionBubble: {
    position: 'absolute',
    top: 30, // Move further up to avoid text overlap
    left: '50%',
    width: 80,
    height: 30, // Further reduced height for better cut-off effect
    marginLeft: -40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomWidth: 0, // Remove bottom border to create cut-off effect
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderTopWidth: 1.5,
    pointerEvents: 'none',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
});