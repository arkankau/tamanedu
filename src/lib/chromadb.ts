/**
 * ChromaDB Client and Database Service
 * Replaces MySQL with ChromaDB for all data operations
 */

import { CloudClient, IEmbeddingFunction } from "chromadb";
import { v4 as uuidv4 } from 'uuid';

// Simple embedding function that doesn't require external dependencies
class SimpleEmbeddingFunction implements IEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    // Return simple embeddings (just zeros, we're not using vector search)
    return texts.map(() => new Array(384).fill(0));
  }
}

// Initialize ChromaDB Cloud Client
const client = new CloudClient({
  apiKey: 'ck-BVfYYJ8wL13qvdiZ87BYvpwdjjgzUf4gDU3J18mZWayD',
  tenant: '053f90af-f7f0-48dd-bd77-1f67ee514158',
  database: 'tamanedu'
});

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  GRADING_SESSIONS: 'grading_sessions',
  ANSWER_KEYS: 'answer_keys',
  STUDENTS: 'students',
  RESPONSES: 'responses',
  GRADES: 'grades'
};

// Helper function to ensure collection exists
async function getOrCreateCollection(name: string) {
  try {
    // Use simple embedding function to avoid needing @chroma-core/default-embed
    return await client.getOrCreateCollection({ 
      name,
      embeddingFunction: new SimpleEmbeddingFunction()
    });
  } catch (error) {
    console.error(`Error getting/creating collection ${name}:`, error);
    throw error;
  }
}

// Database Service
export const DatabaseService = {
  // ==================== USERS ====================
  
  async createUser(email: string, hashedPassword: string, name?: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.USERS);
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await collection.add({
        ids: [id],
        documents: [JSON.stringify({
          id,
          email,
          password: hashedPassword,
          name: name || email.split('@')[0], // Use email prefix as name if not provided
          created_at: now
        })],
        metadatas: [{ 
          email,
          name: name || email.split('@')[0],
          created_at: now
        }]
      });
      
      return {
        data: { id, email, name: name || email.split('@')[0], created_at: now },
        error: null
      };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return {
        data: null,
        error: error.message
      };
    }
  },

  async getUserByEmail(email: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.USERS);
      const results = await collection.get({
        where: { email }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: null, error: null };
      }
      
      const userData = JSON.parse(results.documents[0] as string);
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('Error getting user by email:', error);
      return { data: null, error: error.message };
    }
  },

  async getUserById(userId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.USERS);
      const results = await collection.get({
        ids: [userId]
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: null, error: null };
      }
      
      const userData = JSON.parse(results.documents[0] as string);
      return { data: userData, error: null };
    } catch (error: any) {
      console.error('Error getting user by ID:', error);
      return { data: null, error: error.message };
    }
  },

  // ==================== GRADING SESSIONS ====================
  
  async createGradingSession(userId: string, title: string, description: string | null) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADING_SESSIONS);
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const sessionData = {
        id,
        user_id: userId,
        title,
        description,
        created_at: now
      };
      
      await collection.add({
        ids: [id],
        documents: [JSON.stringify(sessionData)],
        metadatas: [{
          user_id: userId,
          title,
          created_at: now
        }]
      });
      
      return { data: sessionData, error: null };
    } catch (error: any) {
      console.error('Error creating grading session:', error);
      return { data: null, error: error.message };
    }
  },

  async getGradingSession(sessionId: string, userId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADING_SESSIONS);
      const results = await collection.get({
        ids: [sessionId],
        where: { user_id: userId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: null, error: null };
      }
      
      const sessionData = JSON.parse(results.documents[0] as string);
      return { data: sessionData, error: null };
    } catch (error: any) {
      console.error('Error getting grading session:', error);
      return { data: null, error: error.message };
    }
  },

  async getGradingSessionsByUser(userId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADING_SESSIONS);
      const results = await collection.get({
        where: { user_id: userId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: [], error: null };
      }
      
      const sessions = results.documents.map((doc: any) => JSON.parse(doc));
      return { data: sessions, error: null };
    } catch (error: any) {
      console.error('Error getting grading sessions by user:', error);
      return { data: [], error: error.message };
    }
  },

  // Alias for getGradingSessionsByUser (for dashboard compatibility)
  async getGradingSessionsByTeacher(userId: string) {
    return this.getGradingSessionsByUser(userId);
  },

  // ==================== ANSWER KEYS ====================
  
  async createAnswerKeys(answerKeys: any[]) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.ANSWER_KEYS);
      const ids: string[] = [];
      const documents: string[] = [];
      const metadatas: any[] = [];
      
      answerKeys.forEach(key => {
        const id = uuidv4();
        ids.push(id);
        documents.push(JSON.stringify({
          id,
          ...key
        }));
        metadatas.push({
          session_id: key.session_id,
          question_number: key.question_number
        });
      });
      
      await collection.add({
        ids,
        documents,
        metadatas
      });
      
      const data = answerKeys.map((key, index) => ({
        id: ids[index],
        ...key
      }));
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating answer keys:', error);
      return { data: null, error: error.message };
    }
  },

  async getAnswerKeysBySession(sessionId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.ANSWER_KEYS);
      const results = await collection.get({
        where: { session_id: sessionId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: [], error: null };
      }
      
      const answerKeys = results.documents.map((doc: any) => {
        const data = JSON.parse(doc);
        // Parse accepted_variants if it's a string
        if (typeof data.accepted_variants === 'string') {
          try {
            data.accepted_variants = JSON.parse(data.accepted_variants);
          } catch {
            data.accepted_variants = [];
          }
        }
        return data;
      });
      
      // Sort by question_number
      answerKeys.sort((a, b) => a.question_number - b.question_number);
      
      return { data: answerKeys, error: null };
    } catch (error: any) {
      console.error('Error getting answer keys by session:', error);
      return { data: [], error: error.message };
    }
  },

  async deleteAnswerKeysBySession(sessionId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.ANSWER_KEYS);
      
      // First, get all answer keys for this session to get their IDs
      const results = await collection.get({
        where: { session_id: sessionId }
      });
      
      if (!results.ids || results.ids.length === 0) {
        return { data: null, error: null }; // Nothing to delete
      }
      
      // Delete all answer keys for this session
      await collection.delete({
        ids: results.ids as string[]
      });
      
      return { data: null, error: null };
    } catch (error: any) {
      console.error('Error deleting answer keys by session:', error);
      return { data: null, error: error.message };
    }
  },

  // ==================== STUDENTS ====================
  
  async createStudents(students: any[]) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.STUDENTS);
      const ids: string[] = [];
      const documents: string[] = [];
      const metadatas: any[] = [];
      
      students.forEach(student => {
        const id = uuidv4();
        ids.push(id);
        documents.push(JSON.stringify({
          id,
          ...student
        }));
        metadatas.push({
          session_id: student.session_id,
          name: student.name
        });
      });
      
      await collection.add({
        ids,
        documents,
        metadatas
      });
      
      const data = students.map((student, index) => ({
        id: ids[index],
        ...student
      }));
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating students:', error);
      return { data: null, error: error.message };
    }
  },

  async getStudentsBySession(sessionId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.STUDENTS);
      const results = await collection.get({
        where: { session_id: sessionId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: [], error: null };
      }
      
      const students = results.documents.map((doc: any) => JSON.parse(doc));
      return { data: students, error: null };
    } catch (error: any) {
      console.error('Error getting students by session:', error);
      return { data: [], error: error.message };
    }
  },

  // ==================== RESPONSES ====================
  
  async createResponses(responses: any[]) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.RESPONSES);
      const ids: string[] = [];
      const documents: string[] = [];
      const metadatas: any[] = [];
      
      responses.forEach(response => {
        const id = uuidv4();
        ids.push(id);
        documents.push(JSON.stringify({
          id,
          ...response
        }));
        metadatas.push({
          student_id: response.student_id,
          question_number: response.question_number
        });
      });
      
      await collection.add({
        ids,
        documents,
        metadatas
      });
      
      const data = responses.map((response, index) => ({
        id: ids[index],
        ...response
      }));
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating responses:', error);
      return { data: null, error: error.message };
    }
  },

  async getResponsesByStudent(studentId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.RESPONSES);
      const results = await collection.get({
        where: { student_id: studentId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: [], error: null };
      }
      
      const responses = results.documents.map((doc: any) => JSON.parse(doc));
      
      // Sort by question_number
      responses.sort((a, b) => a.question_number - b.question_number);
      
      return { data: responses, error: null };
    } catch (error: any) {
      console.error('Error getting responses by student:', error);
      return { data: [], error: error.message };
    }
  },

  // ==================== GRADES ====================
  
  async createGrades(grades: any[]) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADES);
      const ids: string[] = [];
      const documents: string[] = [];
      const metadatas: any[] = [];
      
      grades.forEach(grade => {
        const id = uuidv4();
        ids.push(id);
        documents.push(JSON.stringify({
          id,
          ...grade
        }));
        metadatas.push({
          student_id: grade.student_id,
          question_number: grade.question_number,
          is_correct: grade.is_correct
        });
      });
      
      await collection.add({
        ids,
        documents,
        metadatas
      });
      
      const data = grades.map((grade, index) => ({
        id: ids[index],
        ...grade
      }));
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating grades:', error);
      return { data: null, error: error.message };
    }
  },

  async getGradesByStudent(studentId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADES);
      const results = await collection.get({
        where: { student_id: studentId }
      });
      
      if (!results.documents || results.documents.length === 0) {
        return { data: [], error: null };
      }
      
      const grades = results.documents.map((doc: any) => JSON.parse(doc));
      
      // Sort by question_number
      grades.sort((a, b) => a.question_number - b.question_number);
      
      return { data: grades, error: null };
    } catch (error: any) {
      console.error('Error getting grades by student:', error);
      return { data: [], error: error.message };
    }
  },

  async deleteGradesByStudent(studentId: string) {
    try {
      const collection = await getOrCreateCollection(COLLECTIONS.GRADES);
      
      // First, get all grade IDs for this student
      const results = await collection.get({
        where: { student_id: studentId }
      });
      
      if (results.ids && results.ids.length > 0) {
        await collection.delete({
          ids: results.ids
        });
      }
      
      return { data: { deleted: results.ids?.length || 0 }, error: null };
    } catch (error: any) {
      console.error('Error deleting grades by student:', error);
      return { data: null, error: error.message };
    }
  }
};

// Export client for direct access if needed
export { client };

