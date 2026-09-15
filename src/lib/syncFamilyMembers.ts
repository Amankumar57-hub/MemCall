import { supabase } from './supabase';
import { db } from './db';
import type { FamilyMember } from './db';
import { Network } from '@capacitor/network';

// Since face-api is loaded via a script tag, we declare it to avoid TS errors
declare const faceapi: any;

let modelsLoaded = false;

export const loadFaceModels = async () => {
  if (modelsLoaded) return true;
  
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Failed to load face-api models:', error);
    return false;
  }
};

const getBase64FromUrl = async (url: string): Promise<string> => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
  });
};

const createImageFromBase64 = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

export const syncFamilyMembers = async (userId: string) => {
  const status = await Network.getStatus();
  if (!status.connected) return; // Only sync when online

  try {
    // 1. Fetch from Supabase
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId);

    if (error || !members) return;

    // 2. Load Models
    const isLoaded = await loadFaceModels();
    if (!isLoaded) return;

    // 3. Process each member
    for (const member of members) {
      try {
        const localMember = await db.family_members.get(member.id);
        
        // If it exists locally with a descriptor, and avatar_url hasn't changed, skip computing
        if (localMember && localMember.face_descriptor && localMember.avatar_url === member.avatar_url) {
          continue;
        }

        // Fetch image as Base64 for offline loading
        let base64 = localMember?.avatar_base64;
        if (!base64 || localMember?.avatar_url !== member.avatar_url) {
          base64 = await getBase64FromUrl(member.avatar_url);
        }

        // Compute Face Descriptor
        const img = await createImageFromBase64(base64);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        let descriptor: number[] | undefined = undefined;
        if (detection) {
          // Convert Float32Array to standard array for Dexie storage
          descriptor = Array.from(detection.descriptor);
        }

        const familyMemberToSave: FamilyMember = {
          ...member,
          avatar_base64: base64,
          face_descriptor: descriptor
        };

        await db.family_members.put(familyMemberToSave);
      } catch (err) {
        console.error(`Failed to process face for member ${member.name}:`, err);
        // Save the member anyway without the descriptor so it still appears offline
        await db.family_members.put(member as FamilyMember);
      }
    }
  } catch (error) {
    console.error('Error syncing family members:', error);
  }
};
