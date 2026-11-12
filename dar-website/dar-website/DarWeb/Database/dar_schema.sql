/* =====================================================================
   DAR — Student Housing Platform
   Database: Microsoft SQL Server (2016+)
   Reconciled with the front-end designs (12 pages + auth pages).
   Run the whole script in SSMS / Azure Data Studio.
   ===================================================================== */

IF DB_ID(N'DarDB') IS NULL
    CREATE DATABASE DarDB COLLATE Arabic_100_CI_AI;   -- Arabic-aware sorting/search
GO
USE DarDB;
GO

/* ---- Optional: full reset (DELETES ALL DATA). Uncomment only on a dev DB.
DROP TABLE IF EXISTS Favorite, Review_report, Review, Rental_request, Has_amenity, Amenity,
                     Apartment_image, Apartment, Password_reset_token, Owner_verification,
                     Tenant_profile, Owner_profile, Users, University;
GO
---- */

/* =====================================================================
   1) University
   ===================================================================== */
CREATE TABLE University (
    university_id INT IDENTITY(1,1) CONSTRAINT PK_University PRIMARY KEY,
    name          NVARCHAR(120) NOT NULL CONSTRAINT UQ_University_name UNIQUE,
    city          NVARCHAR(60)  NULL
);
GO

/* =====================================================================
   2) Users  (tenant / owner / admin)
   NOTE: store a salted hash (bcrypt/Argon2/PBKDF2) in password_hash,
         never the plain password.
   ===================================================================== */
CREATE TABLE Users (
    user_id           INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    name              NVARCHAR(100) NOT NULL,
    email             NVARCHAR(255) NOT NULL CONSTRAINT UQ_Users_email UNIQUE,
    password_hash     NVARCHAR(255) NOT NULL,
    phone             NVARCHAR(20)  NOT NULL,
    role              VARCHAR(10)   NOT NULL
                      CONSTRAINT CK_Users_role CHECK (role IN ('tenant','owner','admin')),
    personal_photo    NVARCHAR(500) NULL,
    city              NVARCHAR(60)  NULL,
    email_verified    BIT           NOT NULL CONSTRAINT DF_Users_email_verified DEFAULT 0,
    is_active         BIT           NOT NULL CONSTRAINT DF_Users_is_active DEFAULT 1,
    suspension_reason NVARCHAR(500) NULL,
    suspended_at      DATETIME2(0)  NULL,
    suspended_by      INT           NULL,
    created_at        DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Users_suspended_by FOREIGN KEY (suspended_by) REFERENCES Users(user_id)
);
GO

/* =====================================================================
   3) Owner_profile  (created at sign-up when role = owner)
   ===================================================================== */
CREATE TABLE Owner_profile (
    user_id     INT           NOT NULL CONSTRAINT PK_Owner_profile PRIMARY KEY,
    is_verified BIT           NOT NULL CONSTRAINT DF_Owner_is_verified DEFAULT 0,
    gender      VARCHAR(6)    NOT NULL CONSTRAINT CK_Owner_gender CHECK (gender IN ('male','female')),
    whatsapp    NVARCHAR(20)  NOT NULL,         -- used for the "contact owner" button (wa.me link)
    about       NVARCHAR(1000) NULL,
    CONSTRAINT FK_Owner_profile_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

/* =====================================================================
   4) Tenant_profile  (created at sign-up when role = tenant)
   ===================================================================== */
CREATE TABLE Tenant_profile (
    user_id             INT           NOT NULL CONSTRAINT PK_Tenant_profile PRIMARY KEY,
    university_id       INT           NOT NULL,
    faculty             NVARCHAR(100) NULL,     -- "التخصص"
    gender              VARCHAR(6)    NOT NULL CONSTRAINT CK_Tenant_gender CHECK (gender IN ('male','female')),
    nationality         NVARCHAR(60)  NULL,
    date_of_birth       DATE          NULL,
    bio                 NVARCHAR(500) NULL,     -- "نبذة عنك"
    notify_status       BIT NOT NULL CONSTRAINT DF_Tenant_notify_status DEFAULT 1,       -- request status updates
    notify_email        BIT NOT NULL CONSTRAINT DF_Tenant_notify_email DEFAULT 1,        -- email alerts
    notify_suggestions  BIT NOT NULL CONSTRAINT DF_Tenant_notify_suggestions DEFAULT 0,  -- nearby suggestions
    CONSTRAINT FK_Tenant_profile_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Tenant_profile_university FOREIGN KEY (university_id) REFERENCES University(university_id)
);
GO

/* =====================================================================
   5) Owner_verification  (admin "مراجعة توثيق المالك")
   ===================================================================== */
CREATE TABLE Owner_verification (
    verification_id        INT IDENTITY(1,1) CONSTRAINT PK_Owner_verification PRIMARY KEY,
    owner_id               INT           NOT NULL,
    status                 VARCHAR(10)   NOT NULL CONSTRAINT DF_OwnerVer_status DEFAULT 'pending'
                           CONSTRAINT CK_OwnerVer_status CHECK (status IN ('pending','approved','rejected')),
    id_document_url        NVARCHAR(500) NOT NULL,   -- identity proof
    ownership_document_url NVARCHAR(500) NOT NULL,   -- ownership proof
    review_note            NVARCHAR(500) NULL,       -- reason shown when rejected
    submitted_at           DATETIME2(0)  NOT NULL CONSTRAINT DF_OwnerVer_submitted DEFAULT SYSUTCDATETIME(),
    reviewed_by            INT           NULL,
    reviewed_at            DATETIME2(0)  NULL,
    CONSTRAINT FK_OwnerVer_owner    FOREIGN KEY (owner_id)    REFERENCES Owner_profile(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_OwnerVer_reviewer FOREIGN KEY (reviewed_by) REFERENCES Users(user_id)
);
CREATE INDEX IX_OwnerVer_status ON Owner_verification(status, submitted_at);
GO

/* =====================================================================
   6) Password_reset_token  (forgot-password / reset-password pages)
   Store only the SHA-256 hash of the token that is e-mailed to the user.
   ===================================================================== */
CREATE TABLE Password_reset_token (
    token_id   INT IDENTITY(1,1) CONSTRAINT PK_Password_reset_token PRIMARY KEY,
    user_id    INT          NOT NULL,
    token_hash CHAR(64)     NOT NULL CONSTRAINT UQ_PwdReset_hash UNIQUE,
    expires_at DATETIME2(0) NOT NULL,
    used_at    DATETIME2(0) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_PwdReset_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PwdReset_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
GO

/* =====================================================================
   7) Apartment  (listing)
   ===================================================================== */
CREATE TABLE Apartment (
    apartment_id       INT IDENTITY(1,1) CONSTRAINT PK_Apartment PRIMARY KEY,   -- "رقم الإعلان"
    user_id            INT           NOT NULL,                                  -- owner
    title              NVARCHAR(150) NOT NULL,
    type               VARCHAR(12)   NOT NULL
                       CONSTRAINT CK_Apartment_type CHECK (type IN ('apartment','studio','private_room','shared_room')),
    target_group       VARCHAR(12)   NOT NULL CONSTRAINT DF_Apartment_target DEFAULT 'all_students'
                       CONSTRAINT CK_Apartment_target CHECK (target_group IN ('all_students','female_only','male_only')),

    -- Location
    city               NVARCHAR(60)  NOT NULL,
    area               NVARCHAR(80)  NOT NULL,            -- الحي / المنطقة
    street             NVARCHAR(200) NOT NULL,            -- full address (building no. is never shown publicly)
    lat                DECIMAL(9,6)  NULL,
    lng                DECIMAL(9,6)  NULL,
    university_id      INT           NOT NULL,            -- nearest university
    distance_minutes   TINYINT       NOT NULL,
    transport_mode     VARCHAR(4)    NOT NULL CONSTRAINT DF_Apartment_transport DEFAULT 'walk'
                       CONSTRAINT CK_Apartment_transport CHECK (transport_mode IN ('walk','bus')),

    -- Details
    description        NVARCHAR(2000) NOT NULL,
    area_m2            DECIMAL(6,1)  NOT NULL CONSTRAINT CK_Apartment_area CHECK (area_m2 > 0),
    floor              TINYINT       NOT NULL CONSTRAINT CK_Apartment_floor CHECK (floor BETWEEN 0 AND 4), -- 0 = ground, 4 = 4th or higher
    bedrooms           TINYINT       NOT NULL CONSTRAINT CK_Apartment_bedrooms CHECK (bedrooms BETWEEN 1 AND 4), -- 4 = 4 or more
    bathrooms          TINYINT       NOT NULL CONSTRAINT CK_Apartment_bathrooms CHECK (bathrooms BETWEEN 1 AND 3),
    shared_bathroom    BIT           NOT NULL CONSTRAINT DF_Apartment_shared_bath DEFAULT 0,
    capacity           TINYINT       NOT NULL CONSTRAINT CK_Apartment_capacity CHECK (capacity >= 1), -- max occupants
    furnishing         VARCHAR(7)    NOT NULL CONSTRAINT CK_Apartment_furnishing CHECK (furnishing IN ('full','partial','none')),

    -- Rent & availability
    price              DECIMAL(8,2)  NOT NULL CONSTRAINT CK_Apartment_price CHECK (price > 0),   -- JOD / month
    deposit            DECIMAL(8,2)  NOT NULL CONSTRAINT DF_Apartment_deposit DEFAULT 0,
    min_rental_months  TINYINT       NOT NULL,                                                    -- 3, 4 (semester), 9 (academic year)
    available_from     DATE          NULL,                                                        -- NULL = available now
    utilities_included BIT           NOT NULL CONSTRAINT DF_Apartment_utilities DEFAULT 0,        -- water & electricity
    internet           VARCHAR(9)    NOT NULL CONSTRAINT DF_Apartment_internet DEFAULT 'none'
                       CONSTRAINT CK_Apartment_internet CHECK (internet IN ('none','available','included')),
    extra_cost_note    NVARCHAR(500) NULL,

    -- House rules
    smoking_allowed    BIT           NOT NULL CONSTRAINT DF_Apartment_smoking DEFAULT 0,
    pets_allowed       BIT           NOT NULL CONSTRAINT DF_Apartment_pets DEFAULT 0,
    rules              NVARCHAR(2000) NOT NULL,                                                   -- "شروط الإقامة"

    -- Workflow
    status             VARCHAR(13)   NOT NULL CONSTRAINT DF_Apartment_status DEFAULT 'pending'
                       CONSTRAINT CK_Apartment_status CHECK (status IN
                         ('draft','pending','published','needs_changes','rejected','rented','paused')),
    review_note        NVARCHAR(500) NULL,        -- admin note / rejection reason shown to the owner
    reviewed_by        INT           NULL,
    reviewed_at        DATETIME2(0)  NULL,
    views_count        INT           NOT NULL CONSTRAINT DF_Apartment_views DEFAULT 0,
    created_at         DATETIME2(0)  NOT NULL CONSTRAINT DF_Apartment_created DEFAULT SYSUTCDATETIME(),
    updated_at         DATETIME2(0)  NOT NULL CONSTRAINT DF_Apartment_updated DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Apartment_owner      FOREIGN KEY (user_id)       REFERENCES Owner_profile(user_id),
    CONSTRAINT FK_Apartment_university FOREIGN KEY (university_id) REFERENCES University(university_id),
    CONSTRAINT FK_Apartment_reviewer   FOREIGN KEY (reviewed_by)   REFERENCES Users(user_id)
);
CREATE INDEX IX_Apartment_search ON Apartment(status, city, price) INCLUDE (type, university_id, distance_minutes);
CREATE INDEX IX_Apartment_owner  ON Apartment(user_id, status);
GO

/* =====================================================================
   8) Apartment_image  (first image = cover; sort_order = drag order)
   ===================================================================== */
CREATE TABLE Apartment_image (
    image_id     INT IDENTITY(1,1) CONSTRAINT PK_Apartment_image PRIMARY KEY,
    apartment_id INT           NOT NULL,
    image_url    NVARCHAR(500) NOT NULL,
    is_cover     BIT           NOT NULL CONSTRAINT DF_Image_cover DEFAULT 0,
    sort_order   TINYINT       NOT NULL CONSTRAINT DF_Image_sort DEFAULT 0,
    CONSTRAINT FK_Image_apartment FOREIGN KEY (apartment_id) REFERENCES Apartment(apartment_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX UX_Image_one_cover ON Apartment_image(apartment_id) WHERE is_cover = 1;
CREATE INDEX IX_Image_apartment ON Apartment_image(apartment_id, sort_order);
GO

/* =====================================================================
   9) Amenity + Has_amenity
   ===================================================================== */
CREATE TABLE Amenity (
    amenity_id INT IDENTITY(1,1) CONSTRAINT PK_Amenity PRIMARY KEY,
    name       NVARCHAR(80) NOT NULL CONSTRAINT UQ_Amenity_name UNIQUE
);
CREATE TABLE Has_amenity (
    apartment_id INT NOT NULL,
    amenity_id   INT NOT NULL,
    CONSTRAINT PK_Has_amenity PRIMARY KEY (apartment_id, amenity_id),
    CONSTRAINT FK_HasAmenity_apartment FOREIGN KEY (apartment_id) REFERENCES Apartment(apartment_id) ON DELETE CASCADE,
    CONSTRAINT FK_HasAmenity_amenity   FOREIGN KEY (amenity_id)   REFERENCES Amenity(amenity_id)
);
GO

/* =====================================================================
   10) Rental_request  (tenant -> apartment)
   ===================================================================== */
CREATE TABLE Rental_request (
    request_id       INT IDENTITY(1,1) CONSTRAINT PK_Rental_request PRIMARY KEY,
    apartment_id     INT           NOT NULL,
    user_id          INT           NOT NULL,                  -- tenant
    message          NVARCHAR(1000) NULL,
    start_date       DATE          NOT NULL,                  -- expected move-in
    duration_months  TINYINT       NOT NULL,                  -- 4 is displayed as "فصل دراسي"
    occupants_count  TINYINT       NOT NULL CONSTRAINT DF_Request_occupants DEFAULT 1,
    status           VARCHAR(9)    NOT NULL CONSTRAINT DF_Request_status DEFAULT 'pending'
                     CONSTRAINT CK_Request_status CHECK (status IN ('pending','accepted','rejected','cancelled')),
    rejection_reason NVARCHAR(500) NULL,
    created_at       DATETIME2(0)  NOT NULL CONSTRAINT DF_Request_created DEFAULT SYSUTCDATETIME(),
    updated_at       DATETIME2(0)  NOT NULL CONSTRAINT DF_Request_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Request_apartment FOREIGN KEY (apartment_id) REFERENCES Apartment(apartment_id),
    CONSTRAINT FK_Request_tenant    FOREIGN KEY (user_id)      REFERENCES Tenant_profile(user_id)
);
-- A tenant can have only one pending request per apartment
CREATE UNIQUE INDEX UX_Request_one_pending ON Rental_request(apartment_id, user_id) WHERE status = 'pending';
CREATE INDEX IX_Request_apartment ON Rental_request(apartment_id, status);
CREATE INDEX IX_Request_tenant    ON Rental_request(user_id, status);
CREATE INDEX IX_Request_created   ON Rental_request(created_at);   -- weekly chart in admin dashboard
GO

/* =====================================================================
   11) Review + Review_report
   ===================================================================== */
CREATE TABLE Review (
    review_id      INT IDENTITY(1,1) CONSTRAINT PK_Review PRIMARY KEY,
    apartment_id   INT           NOT NULL,
    user_id        INT           NOT NULL,
    rating         TINYINT       NOT NULL CONSTRAINT CK_Review_rating CHECK (rating BETWEEN 1 AND 5),
    comment        NVARCHAR(1000) NULL,
    status         VARCHAR(9)    NOT NULL CONSTRAINT DF_Review_status DEFAULT 'published'
                   CONSTRAINT CK_Review_status CHECK (status IN ('published','deleted')),
    deleted_reason NVARCHAR(500) NULL,
    deleted_by     INT           NULL,
    deleted_at     DATETIME2(0)  NULL,
    created_at     DATETIME2(0)  NOT NULL CONSTRAINT DF_Review_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Review_apartment FOREIGN KEY (apartment_id) REFERENCES Apartment(apartment_id),
    CONSTRAINT FK_Review_user      FOREIGN KEY (user_id)      REFERENCES Users(user_id),
    CONSTRAINT FK_Review_deleter   FOREIGN KEY (deleted_by)   REFERENCES Users(user_id),
    CONSTRAINT UQ_Review_one_per_user UNIQUE (apartment_id, user_id)
);
CREATE INDEX IX_Review_apartment ON Review(apartment_id, status);
GO

CREATE TABLE Review_report (
    report_id   INT IDENTITY(1,1) CONSTRAINT PK_Review_report PRIMARY KEY,
    review_id   INT           NOT NULL,
    reporter_id INT           NOT NULL,
    reason      VARCHAR(16)   NOT NULL
                CONSTRAINT CK_Report_reason CHECK (reason IN ('privacy','commercial','abuse','owner_objection','other')),
    details     NVARCHAR(500) NULL,
    status      VARCHAR(6)    NOT NULL CONSTRAINT DF_Report_status DEFAULT 'open'
                CONSTRAINT CK_Report_status CHECK (status IN ('open','closed')),
    resolution  VARCHAR(7)    NULL CONSTRAINT CK_Report_resolution CHECK (resolution IN ('kept','deleted')),
    closed_by   INT           NULL,
    closed_at   DATETIME2(0)  NULL,
    created_at  DATETIME2(0)  NOT NULL CONSTRAINT DF_Report_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Report_review   FOREIGN KEY (review_id)   REFERENCES Review(review_id) ON DELETE CASCADE,
    CONSTRAINT FK_Report_reporter FOREIGN KEY (reporter_id) REFERENCES Users(user_id),
    CONSTRAINT FK_Report_closer   FOREIGN KEY (closed_by)   REFERENCES Users(user_id),
    CONSTRAINT UQ_Report_one_per_user UNIQUE (review_id, reporter_id)
);
CREATE INDEX IX_Report_status ON Review_report(status, created_at);
GO

/* =====================================================================
   12) Favorite  (heart button + "الإعلانات المحفوظة")
   ===================================================================== */
CREATE TABLE Favorite (
    user_id      INT          NOT NULL,
    apartment_id INT          NOT NULL,
    created_at   DATETIME2(0) NOT NULL CONSTRAINT DF_Favorite_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Favorite PRIMARY KEY (user_id, apartment_id),
    CONSTRAINT FK_Favorite_user      FOREIGN KEY (user_id)      REFERENCES Users(user_id),
    CONSTRAINT FK_Favorite_apartment FOREIGN KEY (apartment_id) REFERENCES Apartment(apartment_id) ON DELETE CASCADE
);
GO

/* =====================================================================
   Seed data
   ===================================================================== */
INSERT INTO University (name, city) VALUES
 (N'الجامعة الأردنية', N'عمّان'),
 (N'جامعة العلوم التطبيقية', N'عمّان'),
 (N'جامعة الأميرة سمية', N'عمّان'),
 (N'جامعة أخرى', NULL);

INSERT INTO Amenity (name) VALUES
 (N'إنترنت متوفر'), (N'مكاتب للدراسة'), (N'مطبخ مجهّز'), (N'تدفئة وتكييف'),
 (N'غسالة ملابس'), (N'قريبة من المواصلات'), (N'شرفة وإضاءة طبيعية'), (N'موقف سيارات');
GO
