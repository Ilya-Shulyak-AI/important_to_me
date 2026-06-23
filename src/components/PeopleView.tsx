import React, { useState, useId, useEffect } from 'react';
import {
  Plus, Search, List, Grid, SlidersHorizontal, Trash2, Heart,
  Tag, Loader2, Calendar, User, AlignLeft, Info, HelpCircle, Edit, Star, X
} from 'lucide-react';
import { calculateExactAge, calculateNextAnniversary, formatDateLabel } from '../date-engine/engine';
import { getBlobUrl } from '../database/db';
import PhotoCropper from './PhotoCropper';
import CreatableCombobox, { uniqueCaseInsensitive } from './ui/CreatableCombobox';
import type { Person, Group, CustomField } from '../models/types';

interface PeopleViewProps {
  people: Person[];
  groups: Group[];
  onAddPerson: (person: Omit<Person, 'createdDate' | 'lastUpdatedDate'>) => Promise<void>;
  onUpdatePerson: (person: Person) => Promise<void>;
  onDeletePerson: (id: string) => void;
  onNavigateToPerson: (id: string) => void;
  editPersonId?: string | null;
  onEditPersonConsumed?: () => void;
}

export default function PeopleView({
  people,
  groups,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onNavigateToPerson,
  editPersonId,
  onEditPersonConsumed
}: PeopleViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'birthday' | 'recently-added'>('name');

  // Dialog additions
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Person form states
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dob, setDob] = useState('');
  const [dobPrecision, setDobPrecision] = useState<'full' | 'month-day' | 'year'>('full');
  const [birthTime, setBirthTime] = useState('');
  const [birthLocation, setBirthLocation] = useState('');
  const [sexOrGender, setSexOrGender] = useState('Male');
  const [relationshipOption, setRelationshipOption] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [selectedBloodType, setSelectedBloodType] = useState('');

  // Custom field helpers
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Tag input helpers
  const [newTagInput, setNewTagInput] = useState('');

  // Profile photo state
  const [profilePhotoBlob, setProfilePhotoBlob] = useState<Blob | undefined>(undefined);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(undefined);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profilePhotoBlob) {
      const url = URL.createObjectURL(profilePhotoBlob);
      setPhotoPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPhotoPreviewUrl(undefined);
    }
  }, [profilePhotoBlob]);

  const searchInputId = useId();
  const groupSelectId = useId();
  const tagSelectId = useId();
  const sortSelectId = useId();

  // Aggregate tags for filtering selection
  const allTags = Array.from(new Set(people.flatMap(p => p.tags || [])));

  // Define preset & gathered relationships
  const defaultRelationships = [
    'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister',
    'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter', 'Friend',
    'Best Friend', 'Coworker', 'Client', 'Pastor', 'Relative', 'Other'
  ];
  const dbRelationships = Array.from(new Set(people.map(p => p.relationship).filter(Boolean))) as string[];
  const allRelationshipSuggestions = uniqueCaseInsensitive([...defaultRelationships, ...dbRelationships]);
  const allLocations = uniqueCaseInsensitive(people.map(p => p.birthLocation || ''));
  const allFieldLabels = uniqueCaseInsensitive([...people.flatMap(p => (p.customFields || []).map(f => f.label)), 'Phone Number', 'Email Address', 'Home Address', 'Height', 'Weight', 'Eye Color', 'Hair Color', 'Occupation', 'Education', 'Allergies', 'Favorite Food', 'Hobbies']);

  // Reset/populate form
  const openAddForm = () => {
    setEditingPerson(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setDisplayName('');
    setDob('');
    setDobPrecision('full');
    setBirthTime('');
    setBirthLocation('');
    setSexOrGender('Male');
    setRelationshipOption('');
    setCustomRelationship('');
    setSelectedBloodType('');
    setNotes('');
    setIsFavorite(false);
    setSelectedGroups([]);
    setSelectedTags([]);
    setCustomFields([]);
    setProfilePhotoBlob(undefined);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (person: Person) => {
    setEditingPerson(person);
    setFirstName(person.firstName);
    setMiddleName(person.middleName || '');
    setLastName(person.lastName);
    setDisplayName(person.displayName);
    setDob(person.dob);
    setDobPrecision(person.dobPrecision ?? 'full');
    setBirthTime(person.birthTime || '');
    setBirthLocation(person.birthLocation || '');
    setSexOrGender(person.sexOrGender || 'Male');

    // Set relationship dropdown states
    const rel = person.relationship || '';
    if (!rel) {
      setRelationshipOption('');
      setCustomRelationship('');
    } else if (allRelationshipSuggestions.includes(rel)) {
      setRelationshipOption(rel);
      setCustomRelationship('');
    } else {
      setRelationshipOption('custom');
      setCustomRelationship(rel);
    }

    // Set blood type preset dropdown state
    const bTypeField = (person.customFields ?? []).find(f => f.label === 'Blood Type');
    setSelectedBloodType(bTypeField ? bTypeField.value : '');

    setNotes(person.notes || '');
    setIsFavorite(person.isFavorite);
    setSelectedGroups(person.groups ?? []);
    setSelectedTags(person.tags ?? []);
    setCustomFields(person.customFields ?? []);
    setProfilePhotoBlob(person.profilePhoto);
    setSaveError(null);
    setIsFormOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setCustomFields(prev => [
      ...prev,
      { id: `cf-${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue.trim() }
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedTags(prev => [...prev, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  useEffect(() => {
    if (!editPersonId) return;
    const person = people.find(p => p.id === editPersonId);
    if (person) {
      openEditForm(person);
      onEditPersonConsumed?.();
    }
  }, [editPersonId, people, onEditPersonConsumed]);

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !dob || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const actualRelationship = relationshipOption === 'custom'
      ? customRelationship.trim()
      : relationshipOption.trim();

    const personPayload = {
      id: editingPerson ? editingPerson.id : `p-${Date.now()}`,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      displayName: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`,
      dob,
      dobPrecision,
      birthTime: birthTime || undefined,
      birthLocation: birthLocation || undefined,
      sexOrGender: sexOrGender || 'Male',
      relationship: actualRelationship || undefined,
      notes: notes || undefined,
      isFavorite,
      groups: selectedGroups,
      tags: selectedTags,
      customFields,
      profilePhoto: profilePhotoBlob,
    };

    try {
      if (editingPerson) {
        await onUpdatePerson({
          ...editingPerson,
          ...personPayload,
          createdDate: editingPerson.createdDate,
          lastUpdatedDate: Date.now()
        });
      } else {
        await onAddPerson(personPayload);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to save person', error);
      setSaveError('Could not save this person. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle favoring
  const handleToggleFavorite = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePerson({
      ...person,
      isFavorite: !person.isFavorite,
      lastUpdatedDate: Date.now()
    });
  };

  // Filtering lists
  const now = new Date();

  const processedPeople = people.map(p => {
    const age = calculateExactAge(p.dob, now, p.birthTime);
    const nextAnniv = calculateNextAnniversary(p.dob, now);
    return { person: p, age, nextAnniv };
  });

  const filtered = processedPeople.filter(({ person }) => {
    const q = searchQuery.toLowerCase();
    const nameStr = `${person.firstName} ${person.lastName} ${person.displayName}`.toLowerCase();
    const matchesSearch = nameStr.includes(q) || (person.relationship || '').toLowerCase().includes(q) || (person.tags || []).join(' ').toLowerCase().includes(q) || person.notes?.toLowerCase().includes(q);

    const matchesGroup = selectedGroup === 'all' || person.groups.includes(selectedGroup);
    const matchesTag = selectedTag === 'all' || person.tags.includes(selectedTag);

    return matchesSearch && matchesGroup && matchesTag;
  });

  // Sorting lists
  filtered.sort((a, b) => {
    if (sortBy === 'name') {
      return a.person.displayName.localeCompare(b.person.displayName);
    }
    if (sortBy === 'age') {
      // Younger first or older first? Let's treat older first
      const aDays = a.age.totalDays || 0;
      const bDays = b.age.totalDays || 0;
      return bDays - aDays;
    }
    if (sortBy === 'birthday') {
      // Days remaining to birthday (closest first)
      return a.nextAnniv.daysOnlyRemaining - b.nextAnniv.daysOnlyRemaining;
    }
    if (sortBy === 'recently-added') {
      return b.person.createdDate - a.person.createdDate;
    }
    return 0;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Search Header Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight">People</h2>
          <p className="text-[#7A7A7A] text-sm">Organize and keep details for the important people in your life.</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1 bg-[#5A5A40] hover:bg-opacity-90 text-white py-2.5 px-4 rounded-2xl text-sm font-semibold transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Person
        </button>
      </div>

      {/* Directory filters line */}
      <div className="bg-white border border-[#E5E0D8] p-4 rounded-[24px] flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-[#8C8C8C] w-4 h-4" />
          <input
            id={searchInputId}
            type="text"
            placeholder="Search names, custom descriptors, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-9 pr-4 py-2 text-[#2D2D2D] placeholder-[#8C8C8C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={groupSelectId} className="sr-only">Group</label>
            <select
              id={groupSelectId}
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="all">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={tagSelectId} className="sr-only">Tag</label>
            <select
              id={tagSelectId}
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="all">All Tags</option>
              {allTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={sortSelectId} className="sr-only">Sort By</label>
            <select
              id={sortSelectId}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="name">Sort by Name</option>
              <option value="age">Sort by Age</option>
              <option value="birthday">Sort by Birthday</option>
              <option value="recently-added">Date Logged</option>
            </select>
          </div>

          {/* Toggle Views */}
          <div className="flex bg-[#F5F2ED] p-1 rounded-xl border border-[#E5E0D8] h-9 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#8C8C8C]'}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#8C8C8C]'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid/List Elements */}
      {(searchQuery || selectedGroup !== 'all' || selectedTag !== 'all') && <div className="flex flex-wrap gap-2"><button onClick={() => { setSearchQuery(''); setSelectedGroup('all'); setSelectedTag('all'); }} className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-bold text-[#5A5A40]">Clear filters</button></div>}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-12 text-center text-[#7A7A7A] max-w-lg mx-auto space-y-3 shadow-sm">
          <Info className="w-12 h-12 text-[#5A5A40] opacity-60 mx-auto" />
          <h4 className="text-[#2D2D2D] font-serif font-bold italic text-lg">No people match your filters</h4>
          <p className="text-xs">Try clearing filters, adjusting your search, or adding a new person.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ person, age, nextAnniv }) => (
            <div
              key={person.id}
              onClick={() => onNavigateToPerson(person.id)}
              className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between group space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {person.profilePhoto ? (
                    <img
                      src={getBlobUrl(person.id, person.profilePhoto)}
                      alt={person.displayName}
                      className="w-16 h-16 rounded-full object-cover border border-[#E5E0D8]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center font-bold text-xl border border-[#E5E0D8]">
                      {person.firstName[0]}
                    </div>
                  )}

                  <div>
                    <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D] group-hover:text-[#5A5A40] flex items-center gap-1">
                      {person.displayName}
                      {person.isFavorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </h3>
                    <p className="text-xs text-[#7A7A7A]">
                      {age.isYearUnknown ? 'Born on ' + formatDateLabel(person.dob, 'month-day') : `Born ${formatDateLabel(person.dob, 'full')}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => handleToggleFavorite(person, e)}
                    className="p-2 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] rounded-xl cursor-pointer"
                    aria-label={person.isFavorite ? "Unfavorite" : "Favorite"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${person.isFavorite ? 'text-[#8C6A5D] fill-[#8C6A5D]' : 'text-[#8C8C8C]'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditForm(person); }}
                    className="p-2 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] rounded-xl text-[#5A5A40] transition cursor-pointer"
                    aria-label="Edit Profile"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Age displays detailed */}
              <div className="bg-[#F5F2ED]/40 p-3 rounded-xl border border-[#E5E0D8] space-y-1">
                <div className="text-[#2D2D2D] text-xs">
                  Age: <span className="font-bold text-[#5A5A40]">
                    {age.isYearUnknown ? `${age.totalWeeks} weeks old` : `${age.years} years, ${age.months} months, ${age.days} days`}
                  </span>
                </div>
                <div className="text-[#8C6A5D] text-[10px] font-bold uppercase tracking-wider">
                  Next Birthday in {nextAnniv.daysOnlyRemaining} Days
                </div>
              </div>

              {/* Badges details (groups & tags) */}
              <div className="flex flex-wrap gap-1">
                {person.groups.map(gId => {
                  const matchG = groups.find(g => g.id === gId);
                  if (!matchG) return null;
                  return (
                    <span
                      key={gId}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm"
                      style={{ backgroundColor: `${matchG.color}80` }}
                    >
                      {matchG.name}
                    </span>
                  );
                })}
                {person.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F5F2ED] text-[#7A7A7A] border border-[#E5E0D8]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode View density compact */
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] overflow-hidden divide-y divide-[#E5E0D8] shadow-sm">
          {filtered.map(({ person, age, nextAnniv }) => (
            <div
              key={person.id}
              onClick={() => onNavigateToPerson(person.id)}
              className="p-4 hover:bg-[#F9F8F6] flex items-center justify-between cursor-pointer transition group"
            >
              <div className="flex items-center gap-3">
                {person.profilePhoto ? (
                  <img
                    src={getBlobUrl(person.id, person.profilePhoto)}
                    alt={person.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center font-bold text-xs border border-[#E5E0D8]">
                    {person.firstName[0]}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-serif font-bold italic text-[#2D2D2D] group-hover:text-[#5A5A40] flex items-center gap-1">
                    {person.displayName}
                    {person.isFavorite && <Heart className="w-3 h-3 text-[#8C6A5D] fill-[#8C6A5D]" />}
                  </h4>
                  <p className="text-xs text-[#7A7A7A]">
                    {age.isYearUnknown ? `${age.totalWeeks}w old` : `${age.years}y ${age.months}m ${age.days}d`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-[#8C6A5D]">
                  Birthday in {nextAnniv.daysOnlyRemaining}d
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); openEditForm(person); }}
                  className="p-1 px-2.5 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] rounded text-xs text-[#5A5A40] font-semibold transition cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Form Dialog */}
      {isFormOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-2xl text-[#2D2D2D] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-[#E5E0D8] flex justify-between items-center bg-[#F9F8F6]/85">
              <h3 className="text-lg font-serif font-bold italic text-[#5A5A40]">
                {editingPerson ? 'Edit Person' : 'Add Person'}
              </h3>
              <button
                onClick={() => { if (!isSaving) setIsFormOpen(false); }}
                className="p-1.5 hover:bg-[#E5E0D8]/40 text-[#8C8C8C] rounded-full hover:text-[#2D2D2D] transition cursor-pointer"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {saveError && <div role="alert" className="bg-rose-50 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl border border-rose-200 font-medium">{saveError}</div>}
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3 border-b border-[#E5E0D8] pb-5">
                <div className="relative">
                   {profilePhotoBlob && photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt={displayName || firstName || 'Profile photo preview'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#5A5A40]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#F5F2ED] flex items-center justify-center border-4 border-[#E5E0D8] text-[#8C8C8C]">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCropperOpen(true)}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#5A5A40] text-white rounded-full shadow-md text-xs cursor-pointer"
                    aria-label="Upload profile photo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCropperOpen(true)}
                      className="text-xs text-[#5A5A40] hover:underline font-semibold cursor-pointer"
                    >
                      {profilePhotoBlob ? 'Re-crop photo' : 'Add Photo'}
                    </button>
                    {profilePhotoBlob && (
                      <>
                        <span className="text-[#8C8C8C] text-xs">•</span>
                        <button
                          type="button"
                          onClick={() => setProfilePhotoBlob(undefined)}
                          className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8C8C8C] mt-0.5">Photos are compressed and saved in this browser when you save the person.</p>
                </div>
              </div>

              {/* Photo Cropper Nested Dialog Overlay */}
              {isCropperOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                  <PhotoCropper
                    initialPhotoUrl={photoPreviewUrl}
                    onPhotoSelected={(blob) => {
                      setProfilePhotoBlob(blob);
                      setIsCropperOpen(false);
                    }}
                    onCancel={() => setIsCropperOpen(false)}
                  />
                </div>
              )}

              {/* Names Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Preferred Display Name (Emoji customisable)</label>
                <input
                  type="text"
                  placeholder="e.g. Adaline 🌸 or Grandpa"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              {/* Date of Birth & Time settings */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Birth Date *</label>
                  <input
                    type={dobPrecision === 'full' ? 'date' : 'text'}
                    required
                    placeholder={dobPrecision === 'month-day' ? 'MM-DD' : 'YYYY-MM-DD'}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Date Precision Type</label>
                  <select
                    value={dobPrecision}
                    onChange={(e) => setDobPrecision(e.target.value as any)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  >
                    <option value="full">Full date known (Calculates Age)</option>
                    <option value="month-day">Month & Day only (Year unknown)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Birth Time (Optional)</label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Birth Location (Optional)</label>
                  <CreatableCombobox label="" value={birthLocation} onChange={setBirthLocation} options={allLocations} placeholder="e.g. London, UK" />
                </div>
              </div>

              {/* Relationships & Sex Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A]">Relationship / Role</label>
                  <CreatableCombobox label="" value={relationshipOption === 'custom' ? customRelationship : relationshipOption} onChange={(value) => { setRelationshipOption(value); setCustomRelationship(''); }} options={allRelationshipSuggestions} placeholder="Choose or type a relationship" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Sex</label>
                  <select
                    value={sexOrGender}
                    onChange={(e) => setSexOrGender(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Groups Multiselect checklist */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-2">Assign Groups</label>
                {groups.length === 0 ? (
                  <p className="text-xs text-[#8C8C8C] italic">No custom groups created yet. Create them in Settings.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => {
                      const isSel = selectedGroups.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedGroups(prev => prev.filter(id => id !== g.id));
                            } else {
                              setSelectedGroups(prev => [...prev, g.id]);
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                            isSel
                              ? 'bg-[#5A5A40] border-transparent text-white shadow-sm'
                              : 'bg-white border-[#E5E0D8] text-[#7A7A7A]'
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Tags Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A]">Custom Tags ({selectedTags.length})</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Birthday, Call, High Priority"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="py-2 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                  >
                    Add
                  </button>
                </div>

                {allTags.length > 0 && (
                  <div className="mt-1">
                    <label className="block text-[10px] text-[#7A7A7A] mb-1 font-bold">Quick Select Existing Tag Dropdown:</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedTags.includes(val)) {
                          setSelectedTags(prev => [...prev, val]);
                        }
                      }}
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                    >
                      <option value="">-- Choose an existing tag --</option>
                      {allTags.sort().map(tag => (
                        <option key={tag} value={tag} disabled={selectedTags.includes(tag)}>
                          #{tag} {selectedTags.includes(tag) ? '(Added)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-[#F5F2ED] border border-[#E5E0D8] text-[#2D2D2D] px-2 py-1 rounded-lg font-bold">
                        #{tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="text-[#8C6A5D] hover:opacity-85 font-black text-xs px-0.5" aria-label={`Remove tag ${tag}`}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Fields (unlimited) */}
              <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A]">Unlimited Custom Fields</h4>
                  <p className="text-[10px] text-[#8C8C8C]">Log physical vitals, dimensions, healthcare, registries...</p>
                </div>

                {/* Preset Blood Type Section */}
                <div className="bg-[#5A5A40]/5 p-3 rounded-xl border border-[#E5E0D8] space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#5A5A40]">Preset Field: Blood Type</label>
                    {customFields.some(f => f.label === 'Blood Type') && (
                      <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">Registered</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedBloodType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBloodType(val);
                        if (val) {
                          setCustomFields(prev => {
                            const filtered = prev.filter(f => f.label !== 'Blood Type');
                            return [...filtered, { id: `cf-blood-${Date.now()}`, label: 'Blood Type', value: val }];
                          });
                        } else {
                          setCustomFields(prev => prev.filter(f => f.label !== 'Blood Type'));
                        }
                      }}
                      className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                    >
                      <option value="">-- Click to Select Blood Type --</option>
                      <option value="A+">A+ (A Positive)</option>
                      <option value="A-">A- (A Negative)</option>
                      <option value="B+">B+ (B Positive)</option>
                      <option value="B-">B- (B Negative)</option>
                      <option value="AB+">AB+ (AB Positive)</option>
                      <option value="AB-">AB- (AB Negative)</option>
                      <option value="O+">O+ (O Positive)</option>
                      <option value="O-">O- (O Negative)</option>
                    </select>
                    {customFields.some(f => f.label === 'Blood Type') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomFields(prev => prev.filter(f => f.label !== 'Blood Type'));
                          setSelectedBloodType('');
                        }}
                        className="text-xs px-2.5 py-1 text-[#8C6A5D] bg-white border border-[#E5E0D8] rounded-xl hover:bg-red-50 hover:text-red-600 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1"><CreatableCombobox label="" value={newFieldLabel} onChange={setNewFieldLabel} options={allFieldLabels} placeholder="Field Name (e.g. Clothing Size)" /></div>
                  <input
                    type="text"
                    placeholder="Property Details (e.g. M / 9)"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="py-1.5 px-3 bg-[#8C6A5D] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Insert
                  </button>
                </div>

                {customFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-[#F5F2ED]/40 p-3 rounded-xl border border-[#E5E0D8]">
                    {customFields.map(f => (
                      <div key={f.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg text-xs border border-[#E5E0D8]">
                        <span className="text-[#2D2D2D]">{f.label}: <strong className="text-[#5A5A40]">{f.value}</strong></span>
                        <button type="button" onClick={() => handleRemoveCustomField(f.id)} className="text-[#8C6A5D] hover:opacity-80 transition cursor-pointer" aria-label={`Remove field ${f.label}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Profile Details / Private Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record addresses, custom memories, childhood traits, favorite recipes..."
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              {/* Favorite Status Toggle */}
              <div className="flex items-center justify-between bg-[#F5F2ED]/40 p-3.5 rounded-xl border border-[#E5E0D8]">
                <div>
                  <h4 className="text-sm font-semibold text-[#2D2D2D] flex items-center gap-1"><Heart className="w-4 h-4 text-[#8C6A5D] fill-[#8C6A5D]" /> Priorities spotlight status</h4>
                  <p className="text-xs text-[#7A7A7A]">Check to lock this individual into priority spotlight rotations on the home interface.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E5E0D8] accent-[#5A5A40]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-[#E5E0D8] pt-4">
                <button
                  type="button"
                  onClick={() => { if (!isSaving) setIsFormOpen(false); }}
                  className="flex-1 py-2.5 px-4 bg-[#F5F2ED] text-[#7A7A7A] border border-[#E5E0D8] text-sm font-semibold rounded-xl cursor-pointer hover:bg-opacity-80 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-[#5A5A40] text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-opacity-95 text-center"
                >
                  {isSaving ? 'Saving…' : 'Save Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
