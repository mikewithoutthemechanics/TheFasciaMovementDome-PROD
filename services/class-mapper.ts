// Class mapper - maps between code expectations and actual database columns

// Map database row to app class object
export function mapClassRowToClass(row: any): any {
  return {
    id: row.id,
    slug: row.slug || '',
    title: row.title || row.name || '',
    dateTime: row.date_time || row.date || '',
    duration: row.duration || row.duration_minutes || 60,
    venueId: row.dome_id || row.venue_id || '',
    teacherId: row.teacher_id || undefined,
    sportTags: row.sport_tags || [],
    bodyAreaTags: row.body_area_tags || [],
    capacity: row.capacity || row.max_participants || 20,
    registered: row.registered || 0,
    status: row.cancelled === true ? 'cancelled' : (row.status || 'published'),
    description: row.description || '',
    price: row.price || 0,
    creditCost: row.credit_cost || 0,
    allowDomeResetOverride: row.allow_dome_reset_override || false,
    classType: row.class_type || 'class',
    workshopPrice: row.workshop_price || undefined,
    customFields: row.custom_fields || undefined,
    workshopMaterials: row.workshop_materials || undefined,
    workshopPrerequisites: row.workshop_prerequisites || undefined,
  };
}

// Map app class object to database row
export function mapClassToClassRow(cls: any): any {
  return {
    id: cls.id,
    slug: cls.slug,
    title: cls.title,
    name: cls.title || cls.name, // Database uses 'name'
    date_time: cls.dateTime,
    date: cls.dateTime?.split('T')[0], // Database has separate date field
    duration_minutes: cls.duration, // Database uses duration_minutes
    dome_id: cls.venueId || null, // Database uses dome_id
    venue_id: cls.venueId || null,
    teacher_id: cls.teacherId || null,
    sport_tags: cls.sportTags,
    body_area_tags: cls.bodyAreaTags,
    max_participants: cls.capacity, // Database uses max_participants
    capacity: cls.capacity,
    registered: cls.registered,
    cancelled: cls.status === 'cancelled', // Database uses cancelled
    status: cls.status,
    description: cls.description,
    price: cls.price,
    credit_cost: cls.creditCost,
    allow_dome_reset_override: cls.allowDomeResetOverride,
    class_type: cls.classType || 'class',
    workshop_price: cls.workshopPrice || null,
    custom_fields: cls.customFields || null,
    workshop_materials: cls.workshopMaterials || null,
    workshop_prerequisites: cls.workshopPrerequisites || null,
  };
}
