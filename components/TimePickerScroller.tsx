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

  useEffect(() => {
    const hour24 = selectedPeriod === 'AM' 
      ? (selectedHour === 12 ? 0 : selectedHour)
      : (selectedHour === 12 ? 12 : selectedHour + 12);
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(timeString);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  const handleScroll = (
    event: any,
    items: any[],
    setter: (value: any) => void,
    getValue: (item: any) => any = (item) => item
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    setter(getValue(items[clampedIndex]));
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Inter-Medium',
  },
  selectedPickerText: {
    color: 'white',
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
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
  },
});