// Mock data for development without Google Sheets credentials

export interface Student {
  id: string;
  name: string;
  phone: string;
  age: number;
  parentName: string;
  course: string;
  classTiming: string;
  examCentre: string;
  notes: string;
  feeStatus: 'Paid' | 'Due';
  lastFeePaid: string;
}

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Aanya', 'Priya', 'Meera',
  'Riya', 'Kavya', 'Tara', 'Nisha', 'Rohan', 'Dev', 'Kabir', 'Aryan', 'Dhruv',
  'Neha', 'Pooja', 'Shreya', 'Kiara', 'Zara'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair',
  'Joshi', 'Mehta', 'Iyer', 'Chopra', 'Rao', 'Das', 'Bhat'
];

const courses = [
  'Vocal - Classical', 'Vocal - Western', 'Guitar', 'Piano/Keyboard',
  'Drums', 'Violin', 'Tabla', 'Flute', 'Sitar', 'Ukulele'
];

const timings = [
  'Mon/Wed 4:00 PM', 'Mon/Wed 5:00 PM', 'Tue/Thu 4:00 PM', 'Tue/Thu 5:00 PM',
  'Tue/Thu 6:00 PM', 'Fri 4:00 PM', 'Sat 10:00 AM', 'Sat 11:00 AM',
  'Sat 2:00 PM', 'Sun 10:00 AM', 'Sun 11:00 AM'
];

const months = [
  'January 2026', 'February 2026', 'March 2026', 'December 2025',
  'November 2025', 'October 2025'
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function generateStudents(count: number): Student[] {
  const students: Student[] = [];
  const usedPhones = new Set<string>();

  for (let i = 0; i < count; i++) {
    let phone: string;
    do {
      phone = generatePhone();
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const parentFirstName = randomFrom(firstNames);
    const isPaid = Math.random() > 0.35;

    students.push({
      id: phone,
      name: `${firstName} ${lastName}`,
      phone,
      age: Math.floor(Math.random() * 25) + 6,
      parentName: `${parentFirstName} ${lastName}`,
      course: randomFrom(courses),
      classTiming: randomFrom(timings),
      examCentre: Math.random() > 0.5 ? 'Centre A' : 'Centre B',
      notes: '',
      feeStatus: isPaid ? 'Paid' : 'Due',
      lastFeePaid: isPaid ? randomFrom(months.slice(0, 3)) : randomFrom(months.slice(3)),
    });
  }

  return students;
}

// Generate a consistent set of mock students (seeded by module load)
export const mockStudents: Student[] = generateStudents(55);
