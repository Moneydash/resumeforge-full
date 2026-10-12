import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller, type FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import schema from '@/schema/schema';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import SocialsFieldsComponent from './forms/Socials';
import ExperienceFieldsComponent from './forms/Experience';
import EducationFieldsComponent from './forms/Education';
import SkillsFieldsComponent from './forms/Skills';
import ProjectFieldsComponent from './forms/Projects';
import AwardFieldsComponent from './forms/Awards';
import CertificationFieldsComponent from './forms/Certifications';
import ReferencesFieldsComponent from './forms/References';
import PersonalFieldsComponent from './forms/Personal';
import { SectionBody, SectionHeader, type SectionControls } from './forms/SectionHeader';
import ChipInput from './forms/ChipInput';
import { SECTION_LABELS, toggleHiddenSection, type SectionId } from '@/utils/section-layout';
import { collapseStore, useCollapsedSections } from '@/utils/section-collapse';
import {
  inputClasses,
  labelClasses,
  sectionDivClasses,
  sectionHeaderClasses,
  addButtonClasses,
  removeButtonClasses,
  cardClasses
} from '@/styles/form-classes';
import { SaveIcon } from 'lucide-react';

interface ResumeFormProps {
  onSubmit: (data: ResumeFormData) => void;
  loading?: boolean;
  template?: string;
  // when true: edits auto-regenerate the preview (debounced) and the submit button is hidden
  liveEdit?: boolean;
  sectionRefs?: {
    personalRef: React.RefObject<HTMLDivElement>;
    summaryRef: React.RefObject<HTMLDivElement>;
    socialsRef: React.RefObject<HTMLDivElement>;
    experienceRef: React.RefObject<HTMLDivElement>;
    educationRef: React.RefObject<HTMLDivElement>;
    skillsRef: React.RefObject<HTMLDivElement>;
    languagesRef: React.RefObject<HTMLDivElement>;
    interestsRef: React.RefObject<HTMLDivElement>;
    projectsRef: React.RefObject<HTMLDivElement>;
    awardsRef: React.RefObject<HTMLDivElement>;
    certificationsRef: React.RefObject<HTMLDivElement>;
    referencesRef: React.RefObject<HTMLDivElement>;
  };
}

const STORAGE_KEY = 'resumeFormData';
const LIVE_EDIT_DEBOUNCE_MS = 2500; // each regeneration is a server-side PDF render, so wait for the user to pause typing

const ResumeForm: React.FC<ResumeFormProps> = ({ onSubmit, template, loading = false, liveEdit = false, sectionRefs }) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const { register, handleSubmit, control, reset, formState: { errors }, setValue, watch, getValues, trigger } = useForm<ResumeFormData>({
    resolver: yupResolver(schema as any),
    defaultValues: {
      personal: {
        name: '',
        headline: '',
        email: '',
        website: { name: '', link: '' },
        location: '',
        contact_number: ''
      },
      socials: [], // Initialize as empty array
      summary: '',
      skills: [], // Initialize as empty array
      languages: [],
      awards: [],
      certifications: [],
      interests: [],
      experience: [],
      education: [],
      projects: [],
      references: []
    }
  });

  // Field arrays for dynamic sections
  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control,
    name: 'socials'
  });

  const { fields: skillsFields, append: appendSkill, remove: removeSkill, move: moveSkill } = useFieldArray({
    control,
    name: 'skills'
  });

  const { fields: experienceFields, append: appendExperience, remove: removeExperience, move: moveExperience } = useFieldArray({
    control,
    name: 'experience'
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation, move: moveEducation } = useFieldArray({
    control,
    name: 'education'
  });

  const { fields: projectFields, append: appendProject, remove: removeProject, move: moveProject } = useFieldArray({
    control,
    name: 'projects'
  });

  const { fields: awardFields, append: appendAward, remove: removeAward, move: moveAward } = useFieldArray({
    control,
    name: 'awards'
  });

  const { fields: certificationFields, append: appendCertification, remove: removeCertification, move: moveCertification } = useFieldArray({
    control,
    name: 'certifications'
  });

  const { fields: referenceFields, append: appendReference, remove: removeReference, move: moveReference } = useFieldArray({
    control,
    name: 'references'
  });

  // Parent toggles (saved with the resume) and fold state (view-only, remembered in localStorage)
  const hiddenSections = watch('hiddenSections') ?? [];
  const collapsedSections = useCollapsedSections();

  const controlsFor = (id: SectionId): SectionControls => ({
    hidden: hiddenSections.includes(id),
    collapsed: collapsedSections.includes(id),
    onToggleHidden: () => setValue('hiddenSections', toggleHiddenSection(getValues('hiddenSections'), id), { shouldDirty: true }),
    onToggleCollapsed: () => collapseStore.toggle(id),
  });

  // A collapsed section would hide its own validation errors, so open the ones that have any
  const handleInvalid = (formErrors: FieldErrors<ResumeFormData>) => {
    collapseStore.expandMany(Object.keys(formErrors).filter((key): key is SectionId => key in SECTION_LABELS));
  };

  // Load saved data from localStorage when component mounts
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);

        // Ensure all arrays exist in the parsed data
        const completeData = {
          personal: {
            name: '',
            headline: '',
            email: '',
            website: { name: '', link: '' },
            location: '',
            contact_number: '',
          },
          socials: [],
          summary: '',
          skills: [],
          languages: [],
          awards: [],
          certifications: [],
          interests: [],
          experience: [],
          education: [],
          projects: [],
          references: [],
          ...parsedData
        };

        // Reset the form with saved data
        reset(completeData);
      } catch (error) {
        console.error('Error parsing saved resume data:', error);
      }
    }
  }, [reset]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (loading) {
      setLoadingStep(0);
      if (template === "andromeda") {
        timers.push(setTimeout(() => setLoadingStep(1), 2000)); // After 2s: "Checking fonts ..."
        timers.push(setTimeout(() => setLoadingStep(2), 2000 + 10000)); // After 10s: "Styling ..."
        timers.push(setTimeout(() => setLoadingStep(3), 2000 + 10000 + 35000)); // After 47s: "Generating your resume..."
        timers.push(setTimeout(() => setLoadingStep(4), 2000 + 10000 + 35000 + 10000)); // After 15s: "Almost there ..."
      } else if (template === "cigar") {
        timers.push(setTimeout(() => setLoadingStep(1), 2000)); // After 2s: "Checking fonts ..."
        timers.push(setTimeout(() => setLoadingStep(2), 2000 + 5000)); // After 7s: "Styling ..."
        timers.push(setTimeout(() => setLoadingStep(3), 2000 + 5000 + 8000)); // After 15s: "Generating your resume..."
      } else if (template === "milky_way") {
        timers.push(setTimeout(() => setLoadingStep(1), 2000)); // After 2s: "Checking fonts ..."
        timers.push(setTimeout(() => setLoadingStep(2), 2000 + 7000)); // After 9s: "Styling ..."
        timers.push(setTimeout(() => setLoadingStep(3), 2000 + 7000 + 3000)); // After 12s: "Generating your resume..."
      } else {
        timers.push(setTimeout(() => setLoadingStep(1), 800)); // After 2s: "Checking fonts ..."
        timers.push(setTimeout(() => setLoadingStep(2), 800 + 950)); // After 4s: "Styling ..."
        timers.push(setTimeout(() => setLoadingStep(3), 800 + 950 + 1000)); // After 4s: "Generating your resume..."
      }
    } else {
      setLoadingStep(0); // Reset when not loading
      timers.forEach(timer => clearTimeout(timer));
    }

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [loading, template]);

  const handleSubmitForm = (data: ResumeFormData) => {
    lastSubmittedRef.current = JSON.stringify(getValues());
    // Save form data to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving resume data:', error);
    }
    // Process projects technologies from comma-separated strings to arrays
    const processedData = {
      ...data,
      projects: data.projects.map(project => ({
        ...project,
        technologies: typeof project.technologies === 'string'
          ? (project.technologies as string).split(',').map(t => t.trim()).filter(t => t.length > 0)
          : project.technologies || []
      }))
    };
    onSubmit(processedData);
  };

  // Always-fresh handles so the debounced live-edit callback never uses stale closures
  const lastSubmittedRef = useRef('');
  const submitRef = useRef<() => void>(() => { });
  const loadingRef = useRef(loading);
  submitRef.current = handleSubmit(handleSubmitForm);
  loadingRef.current = loading;

  // Live edit: once the preview exists, regenerate it after the user stops typing
  useEffect(() => {
    if (!liveEdit) return;
    lastSubmittedRef.current = JSON.stringify(getValues()); // baseline = what the preview already shows
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      if (loadingRef.current) { // a render is in flight; try again shortly instead of stacking requests
        timer = setTimeout(run, 1000);
        return;
      }
      if (JSON.stringify(getValues()) === lastSubmittedRef.current) return; // nothing actually changed
      submitRef.current(); // goes through validation; invalid forms are simply not submitted
    };
    const subscription = watch(() => {
      clearTimeout(timer);
      timer = setTimeout(run, LIVE_EDIT_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [liveEdit, watch, getValues]);

  return (
    <form onSubmit={handleSubmit(handleSubmitForm, handleInvalid)} className="@container space-y-8">

      {/* Personal Details */}
      <div ref={sectionRefs?.personalRef}>
        <PersonalFieldsComponent
          sectionHeaderClasses={sectionHeaderClasses}
          sectionDivClasses={sectionDivClasses}
          labelClasses={labelClasses}
          register={register}
          errors={errors}
          inputClasses={inputClasses}
        />
      </div>

      {/* Professional Summary Field */}
      <div className="space-y-4" ref={sectionRefs?.summaryRef}>
        <SectionHeader title="Summary" controls={controlsFor('summary')} />
        <SectionBody collapsed={collapsedSections.includes('summary')} hidden={hiddenSections.includes('summary')}>
          <Label htmlFor="summary" className={labelClasses}>Summary</Label>
          <Textarea
            id="summary"
            {...register('summary')}
            rows={10}
            placeholder="Write a brief professional summary highlighting your key achievements and skills..."
          />
        </SectionBody>
      </div>

      {/* Social Links Fields */}
      <div ref={sectionRefs?.socialsRef}>
        <SocialsFieldsComponent
          controls={controlsFor('socials')}
          appendSocial={appendSocial}
          addButtonClasses={addButtonClasses}
          socialFields={socialFields}
          setValue={setValue}
          control={control}
          register={register}
          removeSocial={removeSocial}
        />
      </div>

      {/* Experience Fields */}
      <div ref={sectionRefs?.experienceRef}>
        <ExperienceFieldsComponent
          controls={controlsFor('experience')}
          appendExperience={appendExperience}
          addButtonClasses={addButtonClasses}
          experienceFields={experienceFields}
          cardClasses={cardClasses}
          removeExperience={removeExperience}
          moveExperience={moveExperience}
          inputClasses={inputClasses}
          removeButtonClasses={removeButtonClasses}
          register={register}
          labelClasses={labelClasses}
          errors={errors}
          control={control}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
        />
      </div>

      {/* Education Fields */}
      <div ref={sectionRefs?.educationRef}>
        <EducationFieldsComponent
          controls={controlsFor('education')}
          appendEducation={appendEducation}
          addButtonClasses={addButtonClasses}
          educationFields={educationFields}
          cardClasses={cardClasses}
          removeEducation={removeEducation}
          moveEducation={moveEducation}
          removeButtonClasses={removeButtonClasses}
          errors={errors}
          register={register}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
          control={control}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
        />
      </div>

      {/* Skills */}
      <div ref={sectionRefs?.skillsRef}>
        <SkillsFieldsComponent
          controls={controlsFor('skills')}
          appendSkill={appendSkill}
          addButtonClasses={addButtonClasses}
          cardClasses={cardClasses}
          skillsFields={skillsFields}
          removeSkill={removeSkill}
          moveSkill={moveSkill}
          removeButtonClasses={removeButtonClasses}
          errors={errors}
          register={register}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
          control={control}
        />
      </div>

      {/* Languages */}
      <div className="space-y-4" ref={sectionRefs?.languagesRef}>
        <SectionHeader title="Languages" controls={controlsFor('languages')} />
        <SectionBody collapsed={collapsedSections.includes('languages')} hidden={hiddenSections.includes('languages')}>
          <Label htmlFor="languages" className={labelClasses}>Spoken Languages</Label>
          <Controller
            control={control}
            name="languages"
            render={({ field }) => (
              <ChipInput
                id="languages"
                value={field.value}
                onChange={field.onChange}
                placeholder="Type a language, then press Enter or comma  e.g. Spanish (Fluent)"
              />
            )}
          />
        </SectionBody>
      </div>

      {/* Interests */}
      <div className="space-y-4" ref={sectionRefs?.interestsRef}>
        <SectionHeader title="Interests & Hobbies" controls={controlsFor('interests')} />
        <SectionBody collapsed={collapsedSections.includes('interests')} hidden={hiddenSections.includes('interests')}>
          <Label htmlFor="interests" className={labelClasses}>Interests</Label>
          <Controller
            control={control}
            name="interests"
            render={({ field }) => (
              <ChipInput
                id="interests"
                value={field.value}
                onChange={field.onChange}
                placeholder="Type an interest, then press Enter or comma  e.g. Photography"
              />
            )}
          />
        </SectionBody>
      </div>

      {/* Projects */}
      <div ref={sectionRefs?.projectsRef}>
        <ProjectFieldsComponent
          controls={controlsFor('projects')}
          appendProject={appendProject}
          addButtonClasses={addButtonClasses}
          cardClasses={cardClasses}
          projectFields={projectFields}
          removeProject={removeProject}
          removeButtonClasses={removeButtonClasses}
          errors={errors}
          register={register}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
          moveProject={moveProject}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
          control={control}
        />
      </div>

      {/* Awards Fields */}
      <div ref={sectionRefs?.awardsRef}>
        <AwardFieldsComponent
          controls={controlsFor('awards')}
          appendAward={appendAward}
          addButtonClasses={addButtonClasses}
          awardFields={awardFields}
          cardClasses={cardClasses}
          removeAward={removeAward}
          removeButtonClasses={removeButtonClasses}
          inputClasses={inputClasses}
          register={register}
          labelClasses={labelClasses}
          errors={errors}
          control={control}
          moveAward={moveAward}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
        />
      </div>

      {/* Certifications */}
      <div ref={sectionRefs?.certificationsRef}>
        <CertificationFieldsComponent
          controls={controlsFor('certifications')}
          appendCertification={appendCertification}
          addButtonClasses={addButtonClasses}
          certificationFields={certificationFields}
          cardClasses={cardClasses}
          removeCertification={removeCertification}
          removeButtonClasses={removeButtonClasses}
          errors={errors}
          register={register}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
          moveCertification={moveCertification}
          control={control}
        />
      </div>

      {/* References */}
      <div ref={sectionRefs?.referencesRef}>
        <ReferencesFieldsComponent
          controls={controlsFor('references')}
          appendReference={appendReference}
          addButtonClasses={addButtonClasses}
          cardClasses={cardClasses}
          referenceFields={referenceFields}
          removeReference={removeReference}
          removeButtonClasses={removeButtonClasses}
          errors={errors}
          register={register}
          labelClasses={labelClasses}
          inputClasses={inputClasses}
          watch={watch}
          moveReference={moveReference}
          setValue={setValue}
          trigger={trigger}
          control={control}
        />
      </div>

      {/* Submit Button (hidden in live edit mode) */}
      {!liveEdit && <div className="pt-6">
        <Button
          type="submit"
          disabled={loading}
          className={`
            w-full flex justify-center items-center gap-2 py-3 px-4 
            border border-transparent rounded-lg shadow-sm 
            text-sm font-medium text-white 
            bg-[#111110] hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {loadingStep === 0 && "Saving your information..."}
              {loadingStep === 1 && "Loading fonts for a polished look..."}
              {loadingStep === 2 && "Applying elegant styles..."}
              {loadingStep === 3 && "Creating your resume..."}
              {loadingStep === 4 && "Wrapping things up..."}
            </>
          ) : (
            <><SaveIcon /> Save & Generate Resume</>
          )}
        </Button>
      </div>}
    </form>
  );
};

export default ResumeForm;