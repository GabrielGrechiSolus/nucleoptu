import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoticeBoardPage from './page';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, arrayRemove, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebase';

// Mock the withAuth HOC
jest.mock('../components/withAuth', () => (Component) => Component);

// Mock firebase
jest.mock('../../firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-uid',
      email: 'test@example.com',
    },
  },
}));

// Mock firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayRemove: jest.fn(),
}));

const mockNotices = [
  {
    id: '1',
    title: 'Test Notice 1',
    description: 'Test Description 1',
    type: 'texto',
    importance: 'medium',
    createdAt: Date.now(),
    creatorEmail: 'test@example.com',
    readBy: ['test@example.com'],
    active: true,
    target: 'todos',
  },
  {
    id: '2',
    title: 'Test Notice 2',
    description: 'Test Description 2',
    type: 'texto',
    importance: 'medium',
    createdAt: Date.now(),
    creatorEmail: 'test@example.com',
    readBy: [],
    active: true,
    target: 'todos',
  },
];

describe('NoticeBoardPage', () => {
  beforeEach(() => {
    (collection as jest.Mock).mockReturnValue({});
    (query as jest.Mock).mockReturnValue({});
    (orderBy as jest.Mock).mockReturnValue({});
    (limit as jest.Mock).mockReturnValue({});
    (getDocs as jest.Mock).mockResolvedValue({
      docs: mockNotices.map(notice => ({
        id: notice.id,
        data: () => notice,
      })),
    });
    (doc as jest.Mock).mockImplementation((db, path, id) => ({
      id,
    }));
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        noticeType: 'todos',
      }),
    });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (arrayRemove as jest.Mock).mockReturnValue({});
  });

  it('renders the page title', () => {
    render(<NoticeBoardPage />);
    const titleElement = screen.getByText(/Mural de Avisos/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<NoticeBoardPage />);
    const descriptionElement = screen.getByText(/Aqui você encontrará os últimos avisos e atualizações./i);
    expect(descriptionElement).toBeInTheDocument();
  });

  it('should show "Marcar como não lido" button for read notices', async () => {
    render(<NoticeBoardPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Notice 1')).toBeInTheDocument();
    });

    const unreadButton = screen.getByTitle('Marcar como não lido');
    expect(unreadButton).toBeInTheDocument();
  });
});
