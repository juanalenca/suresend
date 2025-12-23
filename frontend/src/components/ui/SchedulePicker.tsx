import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Calendar, AlertCircle, ChevronUp } from 'lucide-react';
import { Label } from './label';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';

// Register Portuguese locale
registerLocale('pt', ptBR);

interface SchedulePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
}

// Generate arrays for time selection
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
    const { t, i18n } = useTranslation();
    const [isEnabled, setIsEnabled] = useState(!!value);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHour, setSelectedHour] = useState('');
    const [selectedMinute, setSelectedMinute] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
    const [error, setError] = useState('');
    const [isHourOpen, setIsHourOpen] = useState(false);
    const [isMinuteOpen, setIsMinuteOpen] = useState(false);
    const [timeFormatPref, setTimeFormatPref] = useState<string | null>(localStorage.getItem('timeFormat'));
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);

    // Listen for time format preference changes
    useEffect(() => {
        const handleTimeFormatChange = () => {
            setTimeFormatPref(localStorage.getItem('timeFormat'));
        };
        window.addEventListener('timeFormatChanged', handleTimeFormatChange);
        return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChange);
    }, []);

    // Check if we should use 12-hour format
    // Priority: localStorage preference > language default
    const is12HourFormat = timeFormatPref
        ? timeFormatPref === '12h'
        : i18n.language === 'en';

    // Get locale based on current language
    const getLocale = () => i18n.language === 'pt' ? 'pt' : 'en';

    // Get date format based on current language
    const getDateFormat = () => i18n.language === 'pt' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (hourRef.current && !hourRef.current.contains(event.target as Node)) {
                setIsHourOpen(false);
            }
            if (minuteRef.current && !minuteRef.current.contains(event.target as Node)) {
                setIsMinuteOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize from value prop
    useEffect(() => {
        if (value) {
            const local = new Date(value);
            setSelectedDate(local);

            const hours = local.getHours();
            const minutes = local.getMinutes();

            if (is12HourFormat) {
                // Convert 24h to 12h format
                const period = hours >= 12 ? 'PM' : 'AM';
                let hour12 = hours % 12;
                if (hour12 === 0) hour12 = 12;
                setSelectedHour(hour12.toString().padStart(2, '0'));
                setSelectedPeriod(period);
            } else {
                setSelectedHour(hours.toString().padStart(2, '0'));
            }

            setSelectedMinute(minutes.toString().padStart(2, '0'));
            setIsEnabled(true);
        }
    }, []);

    // Convert 12h to 24h
    const get24Hour = (hour12: string, period: 'AM' | 'PM'): number => {
        let hour = parseInt(hour12);
        if (period === 'AM') {
            return hour === 12 ? 0 : hour;
        } else {
            return hour === 12 ? 12 : hour + 12;
        }
    };

    // Validate and propagate changes
    useEffect(() => {
        if (!isEnabled) {
            onChange(null);
            setError('');
            return;
        }

        if (!selectedDate || !selectedHour || !selectedMinute) {
            onChange(null);
            return;
        }

        // Create date from selected components
        const dateTime = new Date(selectedDate);

        if (is12HourFormat) {
            const hour24 = get24Hour(selectedHour, selectedPeriod);
            dateTime.setHours(hour24, parseInt(selectedMinute), 0, 0);
        } else {
            dateTime.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
        }

        // Check if date is in the past
        if (dateTime <= new Date()) {
            setError(t('campaigns.schedule.past_error'));
            onChange(null);
            return;
        }

        setError('');
        onChange(dateTime);
    }, [isEnabled, selectedDate, selectedHour, selectedMinute, selectedPeriod, is12HourFormat]);

    // Get minimum date (today)
    const getMinDate = () => new Date();

    // Format time for preview
    const getFormattedTime = () => {
        if (!selectedHour || !selectedMinute) return '';

        if (is12HourFormat) {
            return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
        } else {
            return `${selectedHour}:${selectedMinute}`;
        }
    };

    // Format preview text
    const getPreviewText = () => {
        if (!selectedDate || !selectedHour || !selectedMinute) return null;

        const dateTime = new Date(selectedDate);

        if (is12HourFormat) {
            const hour24 = get24Hour(selectedHour, selectedPeriod);
            dateTime.setHours(hour24, parseInt(selectedMinute), 0, 0);
        } else {
            dateTime.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
        }

        if (dateTime <= new Date()) return null;

        return t('campaigns.schedule.preview', {
            date: dateTime.toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : 'en-US'),
            time: getFormattedTime()
        });
    };

    // Compact dropdown component
    const TimeDropdown = ({
        items,
        value,
        onChange: onValueChange,
        isOpen,
        setIsOpen,
        placeholder,
        refObj
    }: {
        items: string[];
        value: string;
        onChange: (val: string) => void;
        isOpen: boolean;
        setIsOpen: (open: boolean) => void;
        placeholder: string;
        refObj: React.RefObject<HTMLDivElement | null>;
    }) => (
        <div className="relative" ref={refObj}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setIsHourOpen(false);
                    setIsMinuteOpen(false);
                    if (isOpen) return;
                    if (placeholder === 'Hora' || placeholder === 'Hour') {
                        setIsHourOpen(true);
                    } else if (placeholder === 'Min') {
                        setIsMinuteOpen(true);
                    }
                }}
                className={`
                    w-full h-12 px-3 rounded-xl 
                    bg-slate-950/50 border text-center
                    transition-all duration-200
                    flex items-center justify-center gap-1
                    font-mono text-lg
                    ${isOpen
                        ? 'border-amber-500 ring-1 ring-amber-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }
                    ${value ? 'text-amber-400' : 'text-slate-500 text-sm'}
                `}
            >
                {value || placeholder}
                <ChevronUp className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`} />
            </button>

            {/* Dropdown - opens UPWARD */}
            {isOpen && (
                <div className="
                    absolute bottom-full left-0 right-0 mb-2 
                    bg-slate-900 border border-slate-700 
                    rounded-xl shadow-2xl shadow-black/50
                    max-h-48 overflow-y-auto
                    z-50
                ">
                    <div className="grid grid-cols-4 gap-1 p-2">
                        {items.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => {
                                    onValueChange(item);
                                    setIsOpen(false);
                                }}
                                className={`
                                    px-2 py-2 rounded-lg text-sm font-mono
                                    transition-all duration-150
                                    ${value === item
                                        ? 'bg-amber-500 text-slate-900 font-semibold'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-amber-400'
                                    }
                                `}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <Label className="text-slate-200 font-medium cursor-pointer">
                        {t('campaigns.schedule.toggle_label')}
                    </Label>
                </div>
                <button
                    type="button"
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
                        ${isEnabled ? 'bg-amber-500' : 'bg-slate-700'}
                    `}
                >
                    <span
                        className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
                            ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                    />
                </button>
            </div>

            {/* Date/Time Pickers - Animated reveal */}
            <div
                className={`
                    grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible transition-all duration-300 ease-out
                    ${isEnabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
                `}
            >
                {/* Date Picker */}
                <div className="space-y-2">
                    <Label className="text-slate-400 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('campaigns.schedule.date_label')}
                    </Label>
                    <div className="relative">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => setSelectedDate(date)}
                            dateFormat={getDateFormat()}
                            locale={getLocale()}
                            minDate={getMinDate()}
                            placeholderText={i18n.language === 'pt' ? 'Clique para selecionar' : 'Click to select'}
                            className="
                                w-full h-12 px-4 pr-10 rounded-xl 
                                bg-slate-950/50 border border-slate-700 
                                text-slate-200 
                                focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 
                                focus:outline-none
                                transition-all duration-200
                                cursor-pointer
                            "
                            calendarClassName="schedule-datepicker"
                            wrapperClassName="w-full"
                            showPopperArrow={false}
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                {/* Time Picker */}
                <div className="space-y-2">
                    <Label className="text-slate-400 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t('campaigns.schedule.time_label')}
                        <span className="text-slate-600 text-xs ml-1">
                            {is12HourFormat ? '(12h)' : '(24h)'}
                        </span>
                    </Label>
                    <div className="flex items-center gap-2">
                        {/* Hour Selector */}
                        <div className="flex-1" ref={hourRef}>
                            <TimeDropdown
                                items={is12HourFormat ? HOURS_12 : HOURS_24}
                                value={selectedHour}
                                onChange={setSelectedHour}
                                isOpen={isHourOpen}
                                setIsOpen={setIsHourOpen}
                                placeholder={i18n.language === 'pt' ? 'Hora' : 'Hour'}
                                refObj={hourRef}
                            />
                        </div>

                        {/* Separator */}
                        <span className="text-2xl text-slate-500 font-bold">:</span>

                        {/* Minute Selector */}
                        <div className="flex-1" ref={minuteRef}>
                            <TimeDropdown
                                items={MINUTES}
                                value={selectedMinute}
                                onChange={setSelectedMinute}
                                isOpen={isMinuteOpen}
                                setIsOpen={setIsMinuteOpen}
                                placeholder="Min"
                                refObj={minuteRef}
                            />
                        </div>

                        {/* AM/PM Toggle - Only for 12h format */}
                        {is12HourFormat && (
                            <div className="flex flex-col gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPeriod('AM')}
                                    className={`
                                        px-3 py-1 rounded-lg text-xs font-semibold
                                        transition-all duration-200
                                        ${selectedPeriod === 'AM'
                                            ? 'bg-amber-500 text-slate-900'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPeriod('PM')}
                                    className={`
                                        px-3 py-1 rounded-lg text-xs font-semibold
                                        transition-all duration-200
                                        ${selectedPeriod === 'PM'
                                            ? 'bg-amber-500 text-slate-900'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    PM
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && isEnabled && (
                <div className="flex items-center gap-2 text-red-400 text-sm animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Preview */}
            {isEnabled && getPreviewText() && !error && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20">
                    <Calendar className="w-4 h-4" />
                    {getPreviewText()}
                </div>
            )}
        </div>
    );
}
